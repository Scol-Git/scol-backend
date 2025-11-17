/**
 * RabbitMQ Message Sender Implementation
 *
 * Concrete implementation of IMessageSender using RabbitMQ/AMQP.
 * Handles connection management, channel pooling, and message publishing.
 *
 * @class RabbitMQMessageSender
 * @implements {IMessageSender}
 */
import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { Connection, Channel } from 'amqplib';
import {
  type IMessageSender,
  PublishOptions,
} from '@shared/interfaces/infrastructure/IMessageSender.interface';
import { ILogger } from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging/ILogger.interface';

/**
 * RabbitMQ Exchange and Queue Configuration
 * Industrial pattern: Pre-defined topology setup
 */
interface ExchangeConfig {
  name: string;
  type: 'topic' | 'direct' | 'fanout';
  queues: QueueConfig[];
}

interface QueueConfig {
  name: string;
  routingKeys: string[];
  durable?: boolean;
  deadLetterExchange?: string;
}

@Injectable()
export class RabbitMQMessageSender
  implements IMessageSender, OnModuleInit, OnModuleDestroy
{
  private _connection: Connection | null = null;
  private _channel: Channel | null = null;
  private _isConnected = false;
  private _initializedTopology = false;

  // Pre-defined exchange and queue topology (industrial pattern)
  private readonly _topology: ExchangeConfig[] = [
    {
      name: 'scol.events',
      type: 'topic',
      queues: [
        {
          name: 'scol.events.organization',
          routingKeys: [
            'organization.created',
            'organization.updated',
            'organization.deleted',
          ],
          durable: true,
        },
        {
          name: 'scol.events.user',
          routingKeys: ['user.created', 'user.updated', 'user.deleted'],
          durable: true,
        },
        {
          name: 'scol.events.notifications',
          routingKeys: ['notification.*', 'email.*'],
          durable: true,
        },
        // Dead-letter queue for failed messages
        {
          name: 'scol.events.dlq',
          routingKeys: ['#'],
          durable: true,
        },
      ],
    },
  ];

  constructor(
    private readonly _config: ConfigService,
    @Inject(ILogger) private readonly _logger: ILoggerInterface,
  ) {}

  /**
   * Initialize RabbitMQ connection on module startup
   */
  async onModuleInit(): Promise<void> {
    const url = this._config.get<string>('RABBITMQ_URL');

    if (!url) {
      this._logger.LogWarning(
        'RabbitMQ URL not configured. Messaging functionality will be disabled.',
      );
      return;
    }

    try {
      // Type assertion needed due to amqplib type definitions mismatch
      const connection = (await amqp.connect(url)) as unknown as Connection;
      this._connection = connection;
      this._channel = (await (connection as any).createChannel()) as Channel;
      this._isConnected = true;

      this._logger.LogInfo('RabbitMQ connection established successfully', {
        url: this._sanitizeUrl(url),
      });

      // Setup topology (exchanges, queues, bindings) - INDUSTRIAL PRACTICE
      await this._setupTopology();

      // Handle connection errors
      (connection as any).on('error', (err: Error) => {
        this._logger.LogError('RabbitMQ connection error', err);
        this._isConnected = false;
        this._initializedTopology = false;
      });

      (connection as any).on('close', () => {
        this._logger.LogWarning('RabbitMQ connection closed');
        this._isConnected = false;
        this._initializedTopology = false;
      });
    } catch (error) {
      this._logger.LogError('Failed to connect to RabbitMQ', error);
      this._isConnected = false;
      this._initializedTopology = false;
    }
  }

  /**
   * Setup RabbitMQ topology (exchanges, queues, bindings)
   * Industrial practice: Define topology once during initialization
   */
  private async _setupTopology(): Promise<void> {
    if (!this._channel || this._initializedTopology) {
      return;
    }

    try {
      this._logger.LogInfo('Setting up RabbitMQ topology...');

      // Create dead-letter exchange for failed messages
      await this._channel.assertExchange('scol.events.dlx', 'topic', {
        durable: true,
      });

      for (const exchangeConfig of this._topology) {
        // Assert exchange
        await this._channel.assertExchange(
          exchangeConfig.name,
          exchangeConfig.type,
          {
            durable: true,
          },
        );

        this._logger.LogInfo(`Exchange created: ${exchangeConfig.name}`, {
          type: exchangeConfig.type,
        });

        // Create queues and bindings
        for (const queueConfig of exchangeConfig.queues) {
          // Queue arguments for dead-letter handling
          const queueArgs: any = {};
          if (queueConfig.name.includes('dlq')) {
            // Dead-letter queue - store messages permanently
            queueArgs['x-message-ttl'] = 604800000; // 7 days retention
          } else {
            // Regular queue - route failed messages to DLQ
            queueArgs['x-dead-letter-exchange'] = 'scol.events.dlx';
            queueArgs['x-dead-letter-routing-key'] = queueConfig.name;
          }

          // Assert queue
          await this._channel.assertQueue(queueConfig.name, {
            durable: queueConfig.durable ?? true,
            arguments: queueArgs,
          });

          // Bind queue to exchange for each routing key
          for (const routingKey of queueConfig.routingKeys) {
            await this._channel.bindQueue(
              queueConfig.name,
              exchangeConfig.name,
              routingKey,
            );

            this._logger.LogInfo(
              `Queue bound: ${queueConfig.name} -> ${exchangeConfig.name} (${routingKey})`,
            );
          }
        }
      }

      // Create DLQ bindings (route all failed messages to DLQ)
      for (const exchangeConfig of this._topology) {
        const dlqName = `${exchangeConfig.name}.dlq`;
        await this._channel.bindQueue(dlqName, 'scol.events.dlx', '#');
      }

      this._initializedTopology = true;
      this._logger.LogInfo('✅ RabbitMQ topology setup completed', {
        exchanges: this._topology.length,
        totalQueues: this._topology.reduce(
          (sum, ex) => sum + ex.queues.length,
          0,
        ),
      });
    } catch (error) {
      this._logger.LogError('Failed to setup RabbitMQ topology', error);
      throw error;
    }
  }

  /**
   * Publish a single message to RabbitMQ
   *
   * @param queueOrExchange - Queue or exchange name
   * @param message - Message payload
   * @param options - Publishing options (routing key, priority, etc.)
   */
  async publish<T>(
    queueOrExchange: string,
    message: T,
    options?: PublishOptions,
  ): Promise<void> {
    if (!this._isConnected || !this._channel) {
      this._logger.LogWarning(
        'RabbitMQ not connected. Message will not be sent.',
        { queueOrExchange, message },
      );
      return;
    }

    try {
      // Ensure topology is setup (idempotent)
      if (!this._initializedTopology && this._channel) {
        await this._setupTopology();
      }

      // Assert exchange exists (creates if not exists, but topology should handle this)
      await this._channel.assertExchange(queueOrExchange, 'topic', {
        durable: true,
      });

      const routingKey = options?.routingKey || '#'; // Default wildcard
      const messageBuffer = Buffer.from(JSON.stringify(message));

      // Publish message with options (queues are already bound in topology)
      const published = this._channel.publish(
        queueOrExchange,
        routingKey,
        messageBuffer,
        {
          persistent: options?.persistent ?? true,
          priority: options?.priority,
          expiration: options?.expiration?.toString(),
          correlationId: options?.correlationId,
          replyTo: options?.replyTo,
          headers: {
            ...options?.headers,
            timestamp: Date.now(),
          },
        },
      );

      if (!published) {
        // Channel buffer is full, wait for drain event
        this._logger.LogWarning(
          'RabbitMQ channel buffer full, message queued for retry',
          { exchange: queueOrExchange, routingKey },
        );
        // In production, implement backpressure handling
      }

      this._logger.LogInfo('📤 Message published to RabbitMQ', {
        exchange: queueOrExchange,
        routingKey,
        correlationId: options?.correlationId,
      });
    } catch (error) {
      this._logger.LogError('Failed to publish message to RabbitMQ', error, {
        queueOrExchange,
        routingKey: options?.routingKey,
      });
      throw error;
    }
  }

  /**
   * Publish multiple messages in batch
   *
   * @param queueOrExchange - Queue or exchange name
   * @param messages - Array of message payloads
   * @param options - Publishing options
   */
  async publishBatch<T>(
    queueOrExchange: string,
    messages: T[],
    options?: PublishOptions,
  ): Promise<void> {
    if (!this._isConnected || !this._channel) {
      this._logger.LogWarning(
        'RabbitMQ not connected. Batch messages will not be sent.',
        { queueOrExchange, count: messages.length },
      );
      return;
    }

    try {
      for (const message of messages) {
        await this.publish(queueOrExchange, message, options);
      }

      this._logger.LogInfo('📤 Batch messages published to RabbitMQ', {
        exchange: queueOrExchange,
        count: messages.length,
      });
    } catch (error) {
      this._logger.LogError('Failed to publish batch messages', error);
      throw error;
    }
  }

  /**
   * Publish a message with delay (using RabbitMQ delayed message plugin or TTL)
   *
   * @param queueOrExchange - Queue or exchange name
   * @param message - Message payload
   * @param delayMs - Delay in milliseconds
   * @param options - Publishing options
   */
  async publishDelayed<T>(
    queueOrExchange: string,
    message: T,
    delayMs: number,
    options?: PublishOptions,
  ): Promise<void> {
    if (!this._isConnected || !this._channel) {
      this._logger.LogWarning(
        'RabbitMQ not connected. Delayed message will not be sent.',
      );
      return;
    }

    try {
      // Use expiration as delay (requires dead-letter exchange setup)
      const delayedOptions: PublishOptions = {
        ...options,
        expiration: delayMs,
        headers: {
          ...options?.headers,
          'x-delay': delayMs,
        },
      };

      await this.publish(queueOrExchange, message, delayedOptions);

      this._logger.LogInfo('⏰ Delayed message published to RabbitMQ', {
        exchange: queueOrExchange,
        delayMs,
      });
    } catch (error) {
      this._logger.LogError('Failed to publish delayed message', error);
      throw error;
    }
  }

  /**
   * Close RabbitMQ connection on module shutdown
   */
  async onModuleDestroy(): Promise<void> {
    try {
      if (this._channel) {
        await this._channel.close();
        this._channel = null;
      }
      if (this._connection) {
        // Close connection (amqplib Connection.close returns a Promise)
        (this._connection as any).close?.();
        this._connection = null;
      }
      this._isConnected = false;
      this._logger.LogInfo('RabbitMQ connection closed gracefully');
    } catch (error) {
      this._logger.LogError('Error closing RabbitMQ connection', error);
    }
  }

  /**
   * Sanitize URL for logging (remove credentials)
   */
  private _sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      return 'invalid-url';
    }
  }

  /**
   * Get queue names bound to an exchange and routing key
   * Useful for monitoring and UI visibility
   */
  getBoundQueues(exchange: string, routingKey?: string): string[] {
    const exchangeConfig = this._topology.find((ex) => ex.name === exchange);
    if (!exchangeConfig) {
      return [];
    }

    return exchangeConfig.queues
      .filter((queue) => {
        if (!routingKey) return true;
        return queue.routingKeys.some((rk) =>
          this._matchesRoutingKey(rk, routingKey),
        );
      })
      .map((queue) => queue.name);
  }

  /**
   * Check if a routing key matches a pattern (supports wildcards)
   */
  private _matchesRoutingKey(pattern: string, routingKey: string): boolean {
    // Simple wildcard matching: * = one word, # = multiple words
    const patternParts = pattern.split('.');
    const keyParts = routingKey.split('.');

    let patternIdx = 0;
    let keyIdx = 0;

    while (patternIdx < patternParts.length && keyIdx < keyParts.length) {
      if (patternParts[patternIdx] === '#') {
        return true; // Matches everything from here
      }
      if (
        patternParts[patternIdx] !== '*' &&
        patternParts[patternIdx] !== keyParts[keyIdx]
      ) {
        return false;
      }
      patternIdx++;
      keyIdx++;
    }

    return patternIdx === patternParts.length && keyIdx === keyParts.length;
  }
}
