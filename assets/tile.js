// A tile has a glyph, info like isWalkable, isLava, etc., and how players can interact with the tile

Game.Tile = function(properties) {
    properties = properties || {};
    // Call Glyph constructor with our properties
    Game.Glyph.call(this, properties);
    // Set up the properties. Default to false.
    this._walkable = properties["walkable"] || false;
    this._diggable = properties["diggable"] || false;
    this._blocksLight = (properties["blocksLight"] !== undefined) ? properties["blocksLight"] : true;
    this._description = properties["description"] || "";
};
Game.Tile.extend(Game.Glyph); // Tiles inherit from Game.Glyph

// Getters
Game.Tile.prototype.isWalkable = function() {return this._walkable;}
Game.Tile.prototype.isDiggable = function() {return this._diggable;}
Game.Tile.prototype.isBlockingLight = function() {return this._blocksLight;}
Game.Tile.prototype.getDescription = function() {return this._description;}

// Helper function
Game.getNeighborPositions = function(x,y) {
    // Returns 8 neighbors of tile at x,y, in random order
    // TODO: Hardcode the 8 offsets for efficiency/standardization?
    // Use ROT.JS dirns. var dirn = ROT.RNG.getItem(ROT.DIRS["8"]);
    var neighbors = [];
    // Loop through all possible offsets
    for(var dX = -1; dX<2; dX++) {
        for(var dY=-1; dY<2; dY++) {
            if(dX==0 && dY==0) {
                continue;
            }
            neighbors.push({x:x+dX, y:y+dY});
        }
    }
    return ROT.RNG.shuffle(neighbors); // Randomize to avoid bias
}

// Define basic tiles
Game.Tile.nullTile = new Game.Tile(new Game.Glyph()); // Null object pattern. Returned whenever we try to access an out-of-bounds tile
Game.Tile.floorTile = new Game.Tile({
    character: ".",
    walkable: true,
    blocksLight: false,
    description: "The floor"
});
Game.Tile.wallTile = new Game.Tile({
    character: "#",
    foreground: "goldenrod",
    diggable: true,
    description: "A cave wall"
});
Game.Tile.stairsUpTile = new Game.Tile({
    character: "<",
    foreground: "white",
    walkable: true,
    blocksLight: false,
    description: "A staircase leading upwards"
});
Game.Tile.stairsDownTile = new Game.Tile({
    character: ">",
    foreground: "white",
    walkable: true,
    blocksLight: false,
    description: "A staircase leading downwards"
});
Game.Tile.holeToCavernTile = new Game.Tile({
    character: "O",
    foreground: "white",
    walkable: true,
    blocksLight: false,
    description: "A dark hole in the ground"
});
Game.Tile.waterTile = new Game.Tile({
    character: "~",
    foreground: "blue",
    walkable: false,
    blocksLight: false,
    description: "Murky water"
})