'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {
    if (!(vector instanceof Vector)) {
    	throw Error('Можно прибавлять к вектору только вектор типа Vector');
    } 
    else {
    	return new Vector(vector.x + this.x, vector.y + this.y);
    }

  }

  times(number = 1) {
    return new Vector(this.x * number, this.y * number);
  }
}

class Actor {
  constructor(position = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if ((!(position instanceof Vector)) || (!(size instanceof Vector)) || (!(speed instanceof Vector))) {
      throw Error('В качестве аргумента передан не вектор типа Vector');
    }
    this.pos = position;
    this.size = size;
    this.speed = speed;
  }

  get left() {
    return this.pos.x;
  }

  get top() {
    return this.pos.y;
  }

  get right() {
    return this.pos.x + this.size.x;
  }

  get bottom() {
    return this.pos.y + this.size.y;
  }

  get type() {
    return 'actor';
  }

  act() {
  }

  isIntersect(actor) {
    if (actor === this) {
      return false;
    }

    if (!(actor instanceof Actor)) {
    	throw Error('Ошибка при передаче аргумента');
    }
    else {
    	return ((this.left < actor.right) && (this.right > actor.left) && (this.top < actor.bottom) && (this.bottom > actor.top));
    }
  }
}

class Level {
  constructor(playgroundGrid = [], actorArray = []) {
    this.grid = playgroundGrid.slice();
    this.actors = actorArray.slice();
    this.player = this.actors.find(el => el.type === 'player');
    this.height = this.grid.length;
    this.width = Math.max(...this.grid.map(el => el.length), 0);
    this.status = null;
    this.finishDelay = 1;
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0; 
  }

  actorAt(actor) {
    if (!(actor instanceof Actor)) {
      throw Error('Ошибка при передаче аргумента');
    }
    return this.actors.find(el => el.isIntersect(actor));
  }

  obstacleAt(position, size) {
    if (!(position instanceof Vector) && !(size instanceof Vector)) {
      throw Error('Ошибка при передаче аргумента');
    }

    const left = Math.floor(position.x);
    const right = Math.ceil(position.x + size.x);
    const top = Math.floor(position.y);
    const bottom = Math.ceil(position.y + size.y);

    if (right > this.width || left < 0 || top < 0) {
      return 'wall';
    }
    else if (bottom > this.height) {
      return 'lava';
    }

    for (let i = top; i < bottom; i++) {
      for (let k = left; k < right; k++) {
        const cell = this.grid[i][k];
        if (cell) {
          return cell;
        }
      }
    }

  }

  removeActor(actor) {
    const index = this.actors.findIndex(el => el === actor);
   
    if (index !== -1) {
    	this.actors.splice(index, 1);
    }
  }

  noMoreActors(type) {
    return !this.actors.some(el => el.type === type);
  }

  playerTouched(obstacle, actor) {
    if (this.status !== null) {
      return;
    }
    if ((obstacle === 'lava') || (obstacle === 'fireball')) {
      this.status = 'lost';
    }
    else if ((obstacle === 'coin') && (actor.type === 'coin')) {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(dictionary = {}) {
    this.dictionary = Object.assign({}, dictionary);
  }

  actorFromSymbol(symbol) {
    return this.dictionary[symbol];
  }

  obstacleFromSymbol(symbol) {
    if (symbol === 'x') {
      return 'wall';
    }
    else if (symbol === '!') {
      return 'lava';
    }
  }

  createGrid(plan) {
    let grid = [];
    grid = plan.map(el => {
    	return el.split('').map(item => this.obstacleFromSymbol(item));
    });
    return grid;
  }

  createActors(plan) {
    const objects = plan.reduce((memo, el, i) => {
    	el.split('').forEach((item, k) => {
    		let Constr = this.actorFromSymbol(item);
    		if (typeof Constr === 'function') {
    			let obj = new Constr(new Vector(k, i));
    			if (obj instanceof Actor) {
    				memo.push(obj);
    				return memo;
    			}
    		}
    	});
    	return memo;
    }, []);
    return objects;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(position = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(position, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time, level) {
    const nextPos = this.getNextPosition(time);
    const obstacle = level.obstacleAt(nextPos, this.size);
    if (obstacle === undefined) {
      this.pos = nextPos;
    } else {
      this.handleObstacle();
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(position = new Vector(0, 0)) {
    super(position, new Vector(2, 0), new Vector(1, 1));
  }
}

class VerticalFireball extends Fireball {
  constructor(position = new Vector(0, 0)) {
    super(position, new Vector(0, 2), new Vector(1, 1));
  }
}

class FireRain extends Fireball {
  constructor(position = new Vector(0, 0)) {
    super(position, new Vector(0, 3), new Vector(1, 1));
    this.initialpos = position;
  }

  handleObstacle() {
    this.pos = this.initialpos;
  }
}

class Coin extends Actor {
  constructor(position = new Vector(0, 0)) {
    super(position.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.initialpos = this.pos;
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * (2 * Math.PI);
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.initialpos.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(position = new Vector(0, 0)) {
    super(position.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector(0, 0));
  }

  get type() {
    return 'player';
  }
}

const schemas = loadLevels();

const actorDict = {
  '@': Player,
  '=': HorizontalFireball,
  'o': Coin,
  '|': VerticalFireball,
  'v': FireRain
}

const parser = new LevelParser(actorDict);
schemas.then(result => {
  runGame(JSON.parse(result), parser, DOMDisplay)
  .then(() => alert('Вы выиграли приз!'));
});