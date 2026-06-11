import { Injectable } from '@nestjs/common';
import logger from 'src/utils/logger';

interface QueueTask {
  fn: () => Promise<any>;
  priority: 'high' | 'low';
  resolve: (val: any) => void;
  reject: (err: any) => void;
}

@Injectable()
export class DiscordQueueService {
  private highPriorityQueue: QueueTask[] = [];
  private lowPriorityQueue: QueueTask[] = [];
  private running = 0;
  private concurrency = 1;
  private delayBetweenTasksMs = 1200; // 1.2 seconds to stay safe from Discord Rate Limit

  constructor() {
    logger.info('[Discord Queue] Initialized Priority Rate-Limited Queue (concurrency: 1, delay: 1200ms)');
  }

  enqueue<T>(fn: () => Promise<T>, priority: 'high' | 'low' = 'low'): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: QueueTask = { fn, priority, resolve, reject };
      if (priority === 'high') {
        this.highPriorityQueue.push(task);
        logger.info(`[Discord Queue] Enqueued HIGH priority task. Queue lengths - High: ${this.highPriorityQueue.length}, Low: ${this.lowPriorityQueue.length}`);
      } else {
        this.lowPriorityQueue.push(task);
        logger.info(`[Discord Queue] Enqueued LOW priority task. Queue lengths - High: ${this.highPriorityQueue.length}, Low: ${this.lowPriorityQueue.length}`);
      }
      this.next();
    });
  }

  private async next() {
    if (this.running >= this.concurrency) {
      return;
    }

    let task: QueueTask | undefined;
    if (this.highPriorityQueue.length > 0) {
      task = this.highPriorityQueue.shift();
    } else if (this.lowPriorityQueue.length > 0) {
      task = this.lowPriorityQueue.shift();
    }

    if (!task) {
      return;
    }

    this.running++;
    
    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this.running--;
      if (this.delayBetweenTasksMs > 0) {
        await new Promise((r) => setTimeout(r, this.delayBetweenTasksMs));
      }
      this.next();
    }
  }
}
