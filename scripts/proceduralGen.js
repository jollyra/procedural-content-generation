var roomBuilderConstructor = function (world, attempts) {
  "use strict";

  var roomBuilder = {
    digRoom: function (world, room) {
      for(var y = room.y; y <= room.y + room.h; y++) {
        for(var x = room.x; x <= room.x + room.w; x++) {
          world.stage[y][x] = room.colour;
        }
      }
    },

    checkRoomCollisions: function (world, room) {
      var roomWithPadding = {};
      roomWithPadding.x = room.x;
      roomWithPadding.y = room.y;
      roomWithPadding.h = room.h;
      roomWithPadding.w = room.w;
      for(var y = roomWithPadding.y; y <= roomWithPadding.y + roomWithPadding.h; y++) {
        for(var x = roomWithPadding.x; x <= roomWithPadding.x + roomWithPadding.w; x++) {
          if(x >= world.x_max || y >= world.y_max) {
            throw new Error('Oi! That\'s out of bounds!', x, y);
          }
          if (world.stage[y][x] !== 0) {
            return true;
          }
        }
      }
      return false;
    },

    randomRoom: function (world) {
      var MAX_WIDTH = 15; // if odd will use the previous even number
      var MAX_HEIGHT = 15;
      var MIN_WIDTH = 3;
      var MIN_HEIGHT = 3;
      var h = evenize(_.random(MIN_HEIGHT, MAX_HEIGHT));
      var w = evenize(_.random(MIN_WIDTH, MAX_WIDTH));
      var x = oddRng(1, world.x_max - w - 1);
      var y = oddRng(1, world.y_max - h - 1);
      var room = { h: h, w: w, x: x, y: y };
      if (x + w >= world.x_max || y + h >= world.y_max) {
        throw new Error('Oi! That room is too big.', room);
      }
      return room;
    },

    placeRoom: function () {
      var room = this.randomRoom(this.world);
      if (this.checkRoomCollisions(this.world, room) === false) {
        room.colour = colourGenerator.next();
        this.digRoom(this.world, room);
        this.rooms.push(room);
        return true;
      }
      return false;
    },

    update: function () {
      while (this.attempts > 0) {
        this.attempts = this.attempts - 1;
        var wasSuccessful = this.placeRoom();
        if (wasSuccessful === true) {
          return false;  // Not done yet
        }
      }
      return true;  // Now we're done
    },

    animate: function () {
      var that = this;
      var done;
      function timeout() {
        setTimeout(function () {
          done = that.update();
          that.world.render();
          if (!done) {
            timeout();
          }
        }, 0);
      }
      timeout();
    },

    quickRender: function () {
      var that = this;
      var done;
      while (!done) {
        done = that.update();
      }
      that.world.render();
    }
  };

  var newRoomBuilder = Object.create(roomBuilder);
  newRoomBuilder.world = world;
  newRoomBuilder.attempts = attempts;
  newRoomBuilder.rooms = [];
  return newRoomBuilder;
};


function findStartingTile(world) {
  var startingTiles = [];
  for (var y = 0; y < world.y_max; y++) {
    for (var x = 0; x < world.x_max; x++) {
      var valid = true;
      _.forEach(calculateAdjacentTiles(x, y), function (tile) {
        if (world.getTile(tile.x, tile.y) !== 0) {
          valid = false;
        }
      });
      if (valid === true) {
        return {x: x, y: y};
      }
    }
  }
}

function passageCarver(world, x0, y0) {
  'use strict';
  var stack = [];
  stack.push({x: x0, y: y0});
  var colour = colourGenerator.next();

  function delveDeeper() {
    if (stack.length > 0) {
      var tile = stack.pop();
      if (canDig(tile.x, tile.y) === false) {
        return false;
      }
      world.stage[tile.y][tile.x] = colour;
      _.forEach(_.shuffle([pushRight, pushLeft, pushUp, pushDown]), function (direction) {
        direction(tile.x, tile.y);
      });
      return false;
    } else {  // Send a signal to the game loop to stop
      return true;
    }
  }

  function pushRight(x, y) {
    if (canDig(x + 1, y)) {
      stack.push({x: x + 1, y: y});
    }
  }

  function pushLeft(x, y) {
    if (canDig(x - 1, y)) {
      stack.push({x: x - 1, y: y});
    }
  }

  function pushUp(x, y) {
    if (canDig(x, y - 1)) {
      stack.push({x: x, y: y - 1});
    }
  }

  function pushDown(x, y) {
    if (canDig(x, y + 1)) {
      stack.push({x: x, y: y + 1});
    }
  }

  function animate() {
    function timeout() {
      var done;
      setTimeout(function () {
        done = delveDeeper();
        world.render();
        if (!done) {
          timeout();
        }
      }, 0);
    }
    timeout();
  }

  function quickRender() {
    var done;
    while (!done) {
      done = delveDeeper();
    }
    world.render();
  }

  //animate();
  quickRender();
}

function carvePassages(world) {
  var tile = findStartingTile(world);
  if (tile) {
    passageCarver(world, tile.x, tile.y);
    carvePassages(world);
  }
}

function canDig(x, y) {
  if (world.stage[y] === undefined || world.stage[y][x] === undefined) {
    return false;
  }
  var adjacentStructures = 0;
  var adjacentTiles = calculateAdjacentTiles(x, y);
  _.forEach(adjacentTiles, function (tile) {
    if (world.getTile(tile.x, tile.y) > 0) {  // Can't be adjacent to anything other that rock
      adjacentStructures = adjacentStructures + 1;
    }
  });
  return adjacentStructures <= 2;  // A passage can connect to itself (of course)
}

function calculateAdjacentTiles(x0, y0) {
  'use strict';
  var tiles = [];
  for (var x = x0 - 1; x <= x0 + 1; x++) {
    for (var y = y0 - 1; y <= y0 + 1; y++) {
      tiles.push({x: x, y: y});
    }
  }
  return tiles;
}

/* Connect all nodes in the graph - nodes are same coloured regions (passages, rooms).
 * Steps:
 * 1. fully connect the graph
 * 2. find a spanning tree of the graph
 * 3. add back some redundant connections depending on how connected
 *    you want the resulting dungeon
 */

function oddRng(min, max) {
  'use strict';
	var rn = _.random(min, max);
	if (rn % 2 === 0) {
		if (rn === max) {
			rn = rn - 1;
		} else if (rn === min) {
			rn = rn + 1;
		} else {
			var adjustment = _.random(1,2) === 2 ? 1 : -1;
			rn = rn + adjustment;
		}
	}
	return rn;
}

function evenize(x) {
  'use strict';
	if (x === 0) { return x; }
	return _.floor(x / 2) * 2;
}

var colourGenerator = {
	count: 0,
	next: function () {
		this.count = this.count + 1;
		return this.count;
	}
};

var world = worldConstructor(50, 50);
var roomBuilder = roomBuilderConstructor(world, 100);
//roomBuilder.animate();
roomBuilder.quickRender();
world.render();

carvePassages(world);
