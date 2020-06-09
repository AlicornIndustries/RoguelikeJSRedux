// Not to be confused with entity.js

// Create mixins namespace
Game.Mixins = {};

{
    /* Moved to Game.Entity.prototype.tryMove
Game.Mixins.Mobile = { // Guide calls this "moveable"
    name: "Mobile",
    tryMove: function(x,y,d,map) { // Doesn't regard pathfinding or distance 
        var map = this.getMap(); // Why do we pass it as input if we then ignore it?
        var tile = map.getTile(x,y,this.getD());
        var target = map.getEntityAt(x,y,this.getD());
        // If our depth would change, check if we're on a stair
        if(d<this.getD()) {
            if(tile!=Game.Tile.stairsUpTile) {
                Game.sendMessage(this, "You can't go up here!");
            } else {
                Game.sendMessage(this, "You ascend to level %d!", [d+1]);
                this.setPosition(x,y,d);
            }
        } else if(d>this.getD()) {
            if(tile!=Game.Tile.stairsDownTile) {
                Game.sendMessage(this, "You can't go down here!");
            } else {
                this.setPosition(x,y,d);
                Game.sendMessage(this, "You descend to level %d!", [d+1])
            }
        // If entity present, attack it
        } else if(target) {
            // If we are an attacker, try to attack
            if(this.hasMixin("Attacker")) {
                this.attack(target);
                return true;
            } else {
                // If we're not an attacker, do nothing
                return false;
            }
        }
        if (tile.isWalkable()) {
            // Update entity's position
            this.setPosition(x,y,d);
            return true;
        } else if (tile.isDiggable()) {
            map.dig(x,y,d);
            return true;
        }
        return false;
    }
}
*/
}

Game.Mixins.Sight = { // Can see with given radius
    name: "Sight",
    groupName: "Sight",
    init: function(template) {
        this._sightRadius = template["sightRadius"] || 5;
    },
    getSightRadius: function() {
        return this._sightRadius;
    }
}

// All Actor group mixins are scheduled
Game.Mixins.PlayerActor = {
    name: "PlayerActor",
    groupName: "Actor",
    act: function() {
        // Detect if game is over
        if(this.getHp() <= 0 ) {
            Game.Screen.playScreen.setGameEnded(true);
            Game.sendMessage(this, "You have died... Press [ENTER] to continue.");
        }
        // Re-render the screen on your turn
        Game.refresh();
        // Lock the engine, wait async for player input
        this.getMap().getEngine().lock();
        // Clear message queue
        this.clearMessages();
    }
}

Game.Mixins.TestActor = {
    name: "TestActor",
    groupName: "Actor",
    act: function() {
        console.log("TestActor acts.");
    }
}

Game.Mixins.FungusActor = {
    name: "FungusActor",
    groupName: "Actor",
    init: function() {
        this._growthsRemaining = 5;
    },
    act: function() {
        // console.log("Fungus is trying to act at: "+this.getX()+","+this.getY()+". It has "+this._growthsRemaining+" growths remaining.");
        // Random chance to spread
        if(this._growthsRemaining>0) {
            var growthChance = 0.02 // Not exact, since can't grow on own tile
            if(Math.random() <= growthChance) {
                // Coords of random adj tile. Generate offset of [-1 0 1] by picking random number 0~2, then subtracting 1
                var xOffset = Math.floor(Math.random() * 3) - 1;
                var yOffset = Math.floor(Math.random() * 3) - 1;
                // Can't spawn on our own tile
                if (xOffset!=0 || yOffset!=0) {
                    // Grow
                    if(this.getMap().isEmptyFloor(this.getX()+xOffset, this.getY()+yOffset, this.getD())) {
                        var entity = Game.EntityRepository.create("fungus");
                        entity.setPosition(this.getX()+xOffset, this.getY()+yOffset, this.getD());
                        this.getMap().addEntity(entity);
                        this._growthsRemaining--;
                    }
                }
            }
        }
    }
}

Game.Mixins.WanderActor = { // Wanders randomly
    name: "WanderActor",
    groupName: "Actor",
    act: function() {
        // Pick a random direction x,y to move in
        var dirn = ROT.RNG.getItem(ROT.DIRS["8"]);
        this.tryMove(this.getX()+dirn[0], this.getY()+dirn[1], this.getD());
    }
}

// TODO: Make an alternate Destructible setup for entities with only armor (no HP), like living statues
Game.Mixins.Destructible = {
    // Creatures, etc. Has HP.
    name: "Destructible",
    init: function(template) {
        this._maxHp = template["maxHp"] || 1;
        this._hp = template["hp"] || this._maxHp;

        // Armor system. Probably redo this later.
        this._armorDurability = template["armorDurability"] || 0;
        this._armorReduction = template["armorReduction"] || 0;
        // TODO: Armor coverage
        
        // Defense (dodge) values
        this._defenseValue = template["defenseValue"] || 0;
    },
    getHp: function() {
        return this._hp;
    },
    getMaxHp: function() {
        return this._maxHp;
    },
    getDefenseValue: function() {
        // TODO: function should take damageType as input
        return this._defenseValue;
    },
    takeDamage: function(attacker, damage) {
        this._hp -= damage;
        if(this._hp<=0) {
            Game.sendMessage(attacker,"You destroy the %s!",[this.getName()]);
            Game.sendMessage(this, "You die!");
            this.die();
        }
    },
    die: function() {
        if(this.hasMixin(Game.Mixins.PlayerActor)) {
            this.act(); // handles the game ending
        } else {
            this.getMap().removeEntity(this); // Non-players just die.
        }
    }
}

Game.Mixins.Attacker = {
    name: "Attacker",
    groupName: "Attacker",
    init: function(template) {
        this._attackValue = template["attackValue"] || 1;
    },
    attack: function(target) { // TODO: also take weapon used as input?
        // Only works on destructibles
        if(target.hasMixin("Destructible")) {
            var attackValue = this.getAttackValue();
            var defenseValue = target.getDefenseValue();
            // Clamp between 10% and 90%
            var hitChance = Math.min(Math.max(attackValue-defenseValue, 10),90);
            var roll = ROT.RNG.getPercentage();
            if (hitChance >= roll) {
                // Hit
                var damage = 1; // TODO: Flat 1 damage for now
                Game.sendMessage(this, "You strike the %s for %d damage!",[target.getName(), damage]);
                Game.sendMessage(target, "The %s strikes you for %d damage!",[this.getName(),damage]);
                target.takeDamage(this, damage); 

            } else {
                // Miss
                Game.sendMessage(this, "You miss the %s.", [target.getName()]);
                Game.sendMessage(target, "The %s misses you.", [this.getName()]);

            }
            // FUTURE: On miss, drain opponent's stamina or some other "Dodge Meter?"      
        }
    },
    getAttackValue: function() {
        return this._attackValue;
    }
}

Game.Mixins.MessageRecipient = {
    name: "MessageRecipient",
    init: function(template) {
        this._messages = []; // Other entities fill up message queue
    },
    receiveMessage: function(message) {
        this._messages.push(message);
    },
    getMessages:  function() {
        return this._messages;
    },
    clearMessages: function() {
        this._messages = [];
    }
}

Game.Mixins.InventoryHolder = {
    name:"InventoryHolder",
    init: function(template) {
        var inventorySlots = template['inventorySlots'] || 10;
        this._items = new Array(inventorySlots);
    },
    getItems: function() {
        return this._items;
    },
    getItem: function(i) {
        return this._items[i];
    },
    addItem: function(item) {
        // Try to find a slot
        for(var i=0; i<this._items.length; i++) {
            if(!this._items[i]) {
                this._items[i] = item;
                return true;
            }
        }
        return false; // No empty slot found
    },
    removeItem: function(i) {
        this._items[i] = null;
    },
    canAddItem: function() {
        // Check if we have an empty slot
        for(var i=0; i<this._items.length; i++) {
            if(!this._items[i]) {
                return true;
            }
        }
        return false;
    },
    pickupItems: function(indices) {
        // Pick up all items at our position. Indices for array returned by map.getItemsAt
        var mapItems = this._map.getItemsAt(this.getX(), this.getY(), this.getD());
        var added = 0; // number of items added
        // Iterate through all indices
        for(var i=0; i<indices.length; i++) {
            // Try to add. If inventory not full, splice item out of list of items.
            if(this.addItem(mapItems[indices[i]-added])) {
                mapItems.splice(indices[i]-added, 1);
                added++;
            } else {
                // Inventory is full
                break;
            }
        }
        // Update map items
        this._map.setItemsAt(this.getX(), this.getY(), this.getD(), mapItems);
        // True only if we added all items
        return added===indices.length;
    },
    dropItem: function(i) {
        // Drop item on current map tile
        if(this._items[i]) {
            if(this._map) {
                this._map.addItem(this.getX(), this.getY(), this.getD(), this._items[i]);
            }
            this.removeItem(i);
        }
    }
}







Game.sendMessage = function(recipient, message, args) {
    if(recipient.hasMixin(Game.Mixins.MessageRecipient)) {
        // If args passed, format message.
        if(args) {
            message = vsprintf(message,args);
        }
        recipient.receiveMessage(message);
    }
}
Game.sendMessageNearby = function(map, centerX, centerY, radius, message, args) {
    if(args) {
        message = vsprintf(message, args);
    }
    // Get nearby entities, sendMessage to each of them
    entities = map.getEntitiesWithinRadius(centerX, centerY, radius);
    for(var i=0; i<entities.length; i++) {
        if(entities[i].hasMixin(Game.Mixins.MessageRecipient)) {
            entities[i].receiveMessage(message);
        }
    }
}

// Player template.
Game.PlayerTemplate = {
    character: "@",
    foreground: "white",
    background: "black",
    maxHp: 40,
    attackValue: 70,
    defenseValue: 0,
    sightRadius: 6,
    inventorySlots: 22,
    mixins: [Game.Mixins.PlayerActor, Game.Mixins.Attacker,
             Game.Mixins.Destructible, Game.Mixins.Sight,
             Game.Mixins.MessageRecipient, Game.Mixins.InventoryHolder]
}

// Non-player templates are held in repositories
// Create central entity repository
Game.EntityRepository = new Game.Repository("entities", Game.Entity);

Game.EntityRepository.define("fungus", {
    name: "fungus",
    character: "F",
    foreground: "chartreuse",
    background: "black",
    maxHp: 3,
    defenseValue: 0,
    mixins: [Game.Mixins.FungusActor, Game.Mixins.Destructible]
});
Game.EntityRepository.define("timberwolf", {
    name: "timberwolf",
    character: "t",
    foreground: "chocolate",
    background: "black",
    maxHp: 5,
    attackValue: 50,
    defenseValue: 0,
    mixins: [Game.Mixins.WanderActor, Game.Mixins.Attacker,
        Game.Mixins.Destructible]
});
Game.EntityRepository.define("dire timberwolf", {
    name: "dire timberwolf",
    character: "T",
    foreground: "chocolate",
    background: "black",
    maxHp: 7,
    attackValue: 60,
    defenseValue: 0,
    mixins: [Game.Mixins.WanderActor, Game.Mixins.Attacker,
        Game.Mixins.Destructible]
});