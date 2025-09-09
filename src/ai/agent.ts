import * as tf from '@tensorflow/tfjs';

export interface GameState {
  carX: number;
  carY: number;
  carAngle: number;
  finishX: number;
  finishY: number;
  distanceToFinish: number;
  crashed: boolean;
  finished: boolean;
}

export interface TrainingStats {
  episode: number;
  totalReward: number;
  episodeLength: number;
  averageReward: number;
}

export enum Action {
  ACCELERATE = 0,
  BRAKE = 1,
  TURN_LEFT = 2,
  TURN_RIGHT = 3,
  NO_ACTION = 4
}

interface Experience {
  state: number[];
  action: Action;
  reward: number;
  nextState: number[];
  done: boolean;
}

export class DQNAgent {
  private model: tf.Sequential;
  private targetModel: tf.Sequential;
  private replayBuffer: Experience[] = [];
  private epsilon: number = 1.0;
  private epsilonMin: number = 0.01;
  private epsilonDecay: number = 0.995;
  private learningRate: number = 0.001;
  private gamma: number = 0.95;
  private batchSize: number = 32;
  private maxReplayBufferSize: number = 10000;
  private targetUpdateFreq: number = 100;
  private updateCounter: number = 0;
  private isTraining: boolean = false;
  private replayCallCount: number = 0;
  private replayThreshold: number = 4; // Only train every N replay calls

  constructor() {
    this.model = this.buildModel();
    this.targetModel = this.buildModel();
    this.updateTargetModel();
  }

  private buildModel(): tf.Sequential {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          inputShape: [6] // [carX, carY, carAngle, finishX, finishY, distanceToFinish]
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 5, // 5 actions
          activation: 'linear'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(this.learningRate),
      loss: 'meanSquaredError'
    });

    return model;
  }

  private normalizeState(state: GameState): number[] {
    // Normalize state values to [0, 1] range for better training
    return [
      state.carX / 800, // Canvas width
      state.carY / 600, // Canvas height
      (state.carAngle + Math.PI) / (2 * Math.PI), // Normalize angle to [0, 1]
      state.finishX / 40, // Grid width
      state.finishY / 30, // Grid height
      Math.min(state.distanceToFinish / 1000, 1) // Cap and normalize distance
    ];
  }

  public selectAction(state: GameState): Action {
    const normalizedState = this.normalizeState(state);

    // Epsilon-greedy action selection
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * 5) as Action;
    }

    const stateTensor = tf.tensor2d([normalizedState]);
    const qValues = this.model.predict(stateTensor) as tf.Tensor;
    const actionIndex = tf.argMax(qValues, 1).dataSync()[0];
    
    stateTensor.dispose();
    qValues.dispose();

    return actionIndex as Action;
  }

  public calculateReward(
    prevState: GameState,
    currentState: GameState,
    action: Action
  ): number {
    let reward = 0;

    // Penalty for crashing
    if (currentState.crashed) {
      reward = -100;
    }
    // Big reward for finishing
    else if (currentState.finished) {
      reward = 200;
    }
    // Reward for getting closer to finish
    else if (currentState.distanceToFinish < prevState.distanceToFinish) {
      reward = 10 * (prevState.distanceToFinish - currentState.distanceToFinish);
    }
    // Small penalty for getting farther from finish
    else if (currentState.distanceToFinish > prevState.distanceToFinish) {
      reward = -5;
    }
    // Small penalty for time (encourages faster completion)
    else {
      reward = -1;
    }

    return reward;
  }

  public remember(
    state: GameState,
    action: Action,
    reward: number,
    nextState: GameState,
    done: boolean
  ): void {
    const experience: Experience = {
      state: this.normalizeState(state),
      action,
      reward,
      nextState: this.normalizeState(nextState),
      done
    };

    this.replayBuffer.push(experience);

    if (this.replayBuffer.length > this.maxReplayBufferSize) {
      this.replayBuffer.shift();
    }
  }

  public async replay(): Promise<void> {
    if (this.replayBuffer.length < this.batchSize) {
      return;
    }
    
    // Prevent concurrent training calls
    if (this.isTraining) {
      return;
    }
    
    // Throttle training calls - only train every N calls
    this.replayCallCount++;
    if (this.replayCallCount % this.replayThreshold !== 0) {
      return;
    }
    
    this.isTraining = true;
    
    try {
      // Sample random batch from replay buffer
    const batch: Experience[] = [];
    for (let i = 0; i < this.batchSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.replayBuffer.length);
      batch.push(this.replayBuffer[randomIndex]);
    }

    const states = batch.map(e => e.state);
    const nextStates = batch.map(e => e.nextState);

    const statesTensor = tf.tensor2d(states);
    const nextStatesTensor = tf.tensor2d(nextStates);

    const currentQValues = this.model.predict(statesTensor) as tf.Tensor2D;
    const futureQValues = this.targetModel.predict(nextStatesTensor) as tf.Tensor2D;

    const targetQValues = currentQValues.clone();

    const futureQValuesData = await futureQValues.data();
    const targetQValuesArray = Array.from(await targetQValues.data());

    // Update Q-values using Bellman equation
    for (let i = 0; i < batch.length; i++) {
      const experience = batch[i];
      let target = experience.reward;

      if (!experience.done) {
        const maxFutureQ = Math.max(
          ...Array.from(futureQValuesData.slice(i * 5, (i + 1) * 5))
        );
        target = experience.reward + this.gamma * maxFutureQ;
      }

      targetQValuesArray[i * 5 + experience.action] = target;
    }

    const updatedTargetQValues = tf.tensor2d(targetQValuesArray, [this.batchSize, 5]);

    await this.model.fit(statesTensor, updatedTargetQValues, {
      epochs: 1,
      verbose: 0
    });

    // Cleanup tensors
    statesTensor.dispose();
    nextStatesTensor.dispose();
    currentQValues.dispose();
    futureQValues.dispose();
    targetQValues.dispose();
    updatedTargetQValues.dispose();

    // Update target model periodically
    this.updateCounter++;
    if (this.updateCounter % this.targetUpdateFreq === 0) {
      this.updateTargetModel();
    }

    // Decay epsilon
    if (this.epsilon > this.epsilonMin) {
      this.epsilon *= this.epsilonDecay;
    }
    } catch (error) {
      console.error('Error during training:', error);
    } finally {
      this.isTraining = false;
    }
  }

  private updateTargetModel(): void {
    const weights = this.model.getWeights();
    this.targetModel.setWeights(weights);
  }

  public getEpsilon(): number {
    return this.epsilon;
  }

  public getReplayBufferSize(): number {
    return this.replayBuffer.length;
  }

  public async save(): Promise<void> {
    await this.model.save('localstorage://race-ai-model');
  }

  public async load(): Promise<void> {
    try {
      this.model = await tf.loadLayersModel('localstorage://race-ai-model') as tf.Sequential;
      this.updateTargetModel();
    } catch (error) {
      console.log('No saved model found, using new model');
    }
  }
}
