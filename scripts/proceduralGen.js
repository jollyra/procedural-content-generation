var x_m = 50;
var y_m = 50;

// Create a 2d array of zeros.
function emptyStage(x, y) {
	var stage =  new Array(y);
	for(i = 0; i < y; i++) {
		stage[i] = [];
		for(j = 0; j < y; j++) {
			stage[i].push(0);
		}
	}
	return stage;
}

function randomRoom(stage) {
	var MAX_WIDTH = 15,
		MAX_HEIGHT = 15,
		MIN_WIDTH = 3,
		MIN_HEIGHT = 3,
		h = _.random(MIN_HEIGHT, MAX_HEIGHT),
		w = _.random(MIN_WIDTH, MAX_WIDTH),
		x = _.random(3, stage.x_max - w - 1 - 3),
		y = _.random(3, stage.y_max - h - 1 - 3);
	var room = { h: h, w: w, x: x, y: y };
	if (x + w >= x_m || y + h >= y_m) {
		throw new Error('Oi! That room is too big.', room);
	}
	return room;
}

function checkCollisionsOnStage(stage, room) {
	// Add padding to room to ensure 3 tiles between nodes.
	var roomWithPadding = {};
	roomWithPadding.x = room.x - 3;
	roomWithPadding.y = room.y - 3;
	roomWithPadding.h = room.h + 6;
	roomWithPadding.w = room.w + 6;
	for(y = roomWithPadding.y; y <= roomWithPadding.y + roomWithPadding.h; y++) {
		for(x = roomWithPadding.x; x <= roomWithPadding.x + roomWithPadding.w; x++) {
			if(x >= x_m || y >= y_m) {
				console.log(x,y);
			}
			if (stage.stage[y][x] !== 0) {
				return true;
			}
		}
	}
	return false;
}

/* Tries a certain number of times to place random sized rooms within the
 * constraints of the supplied stage. Rooms must not overlap.
 */
function placeRooms(stage, numTries) {
	var rooms = [];

	// Dig the room into the actual stage.
	function digRoom(stage, room) {
		for(y = room.y; y <= room.y + room.h; y++) {
			for(x = room.x; x <= room.x + room.w; x++) {
				stage.stage[y][x] = 1;
			}
		}
	}

	for(i = 0; i < numTries; i++) {
		var room = randomRoom(stage);
		if (checkCollisionsOnStage(stage, room) === false) {
			digRoom(stage, room);
			rooms.push(room);
		} else {
			console.log('placeRooms: room: ', room, 'has collision.');
		}
	}
	return rooms;
}

var arr = emptyStage(x_m, y_m);
var stage = Stage.getStage(arr);
var rooms = placeRooms(stage, 100);
drawStage(stage);