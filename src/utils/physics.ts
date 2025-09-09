import { Car } from '../types/racing';
import { MapData } from '../components/Editor';

export const PHYSICS_CONSTANTS = {
  MAX_SPEED: 4,
  ACCELERATION: 0.25,
  DECELERATION: 0.15,
  FRICTION: 0.08,
  TURN_SPEED: 0.10,
  CAR_SIZE: 16,
  COLLISION_BUFFER: 2,
};

export const CANVAS_CONSTANTS = {
  WIDTH: 800,
  HEIGHT: 600,
  CELL_SIZE: 20,
};

export const CELL_TYPES = {
  WALL: 0,
  ROAD: 1,
  START: 2,
  FINISH: 3,
};

export interface CarInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export const updateCarPhysics = (car: Car, input: CarInput): Car => {
  const updatedCar = { ...car };
  
  // Apply acceleration/deceleration based on input
  if (input.up) {
    updatedCar.acceleration = PHYSICS_CONSTANTS.ACCELERATION;
  } else if (input.down) {
    updatedCar.acceleration = -PHYSICS_CONSTANTS.ACCELERATION;
  } else {
    updatedCar.acceleration = 0;
  }

  // Update speed with acceleration and friction
  updatedCar.speed += updatedCar.acceleration;
  
  // Apply friction
  if (updatedCar.speed > 0) {
    updatedCar.speed = Math.max(0, updatedCar.speed - PHYSICS_CONSTANTS.FRICTION);
  } else if (updatedCar.speed < 0) {
    updatedCar.speed = Math.min(0, updatedCar.speed + PHYSICS_CONSTANTS.FRICTION);
  }

  // Cap speed
  updatedCar.speed = Math.max(-PHYSICS_CONSTANTS.MAX_SPEED * 0.5, 
                              Math.min(PHYSICS_CONSTANTS.MAX_SPEED, updatedCar.speed));

  // Handle turning (only when moving)
  if (Math.abs(updatedCar.speed) > 0.1) {
    if (input.left) {
      updatedCar.angle -= PHYSICS_CONSTANTS.TURN_SPEED * Math.abs(updatedCar.speed) / PHYSICS_CONSTANTS.MAX_SPEED;
    }
    if (input.right) {
      updatedCar.angle += PHYSICS_CONSTANTS.TURN_SPEED * Math.abs(updatedCar.speed) / PHYSICS_CONSTANTS.MAX_SPEED;
    }
  }

  // Calculate velocity components
  updatedCar.velocity.x = Math.cos(updatedCar.angle) * updatedCar.speed;
  updatedCar.velocity.y = Math.sin(updatedCar.angle) * updatedCar.speed;

  // Update position
  const newX = updatedCar.x + updatedCar.velocity.x;
  const newY = updatedCar.y + updatedCar.velocity.y;

  updatedCar.x = newX;
  updatedCar.y = newY;

  return updatedCar;
};

export const checkWallCollision = (car: Car, mapData: MapData): boolean => {
  const carSize = PHYSICS_CONSTANTS.CAR_SIZE;
  const cellSize = CANVAS_CONSTANTS.CELL_SIZE;
  
  // Check bounds
  if (car.x - carSize/2 < 0 || car.x + carSize/2 >= CANVAS_CONSTANTS.WIDTH ||
      car.y - carSize/2 < 0 || car.y + carSize/2 >= CANVAS_CONSTANTS.HEIGHT) {
    return true;
  }

  // Check collision with car corners against map grid
  const corners = [
    { x: car.x - carSize/2, y: car.y - carSize/2 },
    { x: car.x + carSize/2, y: car.y - carSize/2 },
    { x: car.x - carSize/2, y: car.y + carSize/2 },
    { x: car.x + carSize/2, y: car.y + carSize/2 },
  ];

  return corners.some(corner => {
    const gridX = Math.floor(corner.x / cellSize);
    const gridY = Math.floor(corner.y / cellSize);

    if (gridX < 0 || gridX >= mapData.grid[0]?.length || 
        gridY < 0 || gridY >= mapData.grid.length) {
      return true;
    }

    return mapData.grid[gridY][gridX] === CELL_TYPES.WALL;
  });
};

export const checkCarCollision = (car1: Car, car2: Car): boolean => {
  const dx = car1.x - car2.x;
  const dy = car1.y - car2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  const minDistance = PHYSICS_CONSTANTS.CAR_SIZE + PHYSICS_CONSTANTS.COLLISION_BUFFER;
  return distance < minDistance;
};

export const getDistanceToNearestCar = (car: Car, otherCars: Car[]): number => {
  if (otherCars.length === 0) return 1000; // Large distance if no other cars

  let minDistance = Infinity;
  otherCars.forEach(otherCar => {
    if (otherCar.id !== car.id) {
      const dx = car.x - otherCar.x;
      const dy = car.y - otherCar.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      minDistance = Math.min(minDistance, distance);
    }
  });

  return minDistance === Infinity ? 1000 : minDistance;
};

export const getAngleToNearestCar = (car: Car, otherCars: Car[]): number => {
  if (otherCars.length === 0) return 0;

  let nearestCar: Car | null = null;
  let minDistance = Infinity;

  otherCars.forEach(otherCar => {
    if (otherCar.id !== car.id) {
      const dx = car.x - otherCar.x;
      const dy = car.y - otherCar.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCar = otherCar;
      }
    }
  });

  if (!nearestCar) return 0;

  return Math.atan2((nearestCar as Car).y - car.y, (nearestCar as Car).x - car.x);
};

export const getDistanceToNearestWall = (car: Car, mapData: MapData): number => {
  const carSize = PHYSICS_CONSTANTS.CAR_SIZE;
  const cellSize = CANVAS_CONSTANTS.CELL_SIZE;
  const searchRadius = 100; // How far to search for walls
  let minDistance = searchRadius;

  // Check in multiple directions around the car
  const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
  
  angles.forEach(angle => {
    for (let distance = carSize; distance <= searchRadius; distance += 5) {
      const checkX = car.x + Math.cos(angle) * distance;
      const checkY = car.y + Math.sin(angle) * distance;
      
      const gridX = Math.floor(checkX / cellSize);
      const gridY = Math.floor(checkY / cellSize);

      if (gridX < 0 || gridX >= mapData.grid[0]?.length || 
          gridY < 0 || gridY >= mapData.grid.length ||
          mapData.grid[gridY][gridX] === CELL_TYPES.WALL) {
        minDistance = Math.min(minDistance, distance);
        break;
      }
    }
  });

  return minDistance;
};

export const checkFinishLine = (car: Car, mapData: MapData): boolean => {
  if (!mapData.finish) return false;
  
  const finishX = mapData.finish.x * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE / 2;
  const finishY = mapData.finish.y * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE / 2;
  
  const dx = car.x - finishX;
  const dy = car.y - finishY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance < CANVAS_CONSTANTS.CELL_SIZE;
};

export const calculateTrackProgress = (car: Car, mapData: MapData): number => {
  if (!mapData.start || !mapData.finish) return 0;

  const startX = mapData.start.x * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE / 2;
  const startY = mapData.start.y * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE / 2;
  const finishX = mapData.finish.x * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE / 2;
  const finishY = mapData.finish.y * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE / 2;

  const totalDistance = Math.sqrt(
    Math.pow(finishX - startX, 2) + Math.pow(finishY - startY, 2)
  );

  const currentDistance = Math.sqrt(
    Math.pow(car.x - startX, 2) + Math.pow(car.y - startY, 2)
  );

  // This is a simple progress calculation - could be enhanced with checkpoints
  return Math.min(1, currentDistance / totalDistance);
};

export const resolveCarCollision = (car1: Car, car2: Car): { car1: Car; car2: Car } => {
  const dx = car1.x - car2.x;
  const dy = car1.y - car2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) return { car1, car2 }; // Avoid division by zero

  const normalX = dx / distance;
  const normalY = dy / distance;

  // Separate the cars to prevent overlap
  const minDistance = PHYSICS_CONSTANTS.CAR_SIZE + PHYSICS_CONSTANTS.COLLISION_BUFFER;
  const overlap = minDistance - distance;
  const separateX = normalX * overlap * 0.5;
  const separateY = normalY * overlap * 0.5;

  const updatedCar1 = {
    ...car1,
    x: car1.x + separateX,
    y: car1.y + separateY,
    speed: car1.speed * 0.5, // Reduce speed after collision
  };

  const updatedCar2 = {
    ...car2,
    x: car2.x - separateX,
    y: car2.y - separateY,
    speed: car2.speed * 0.5, // Reduce speed after collision
  };

  return { car1: updatedCar1, car2: updatedCar2 };
};
