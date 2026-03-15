/**
 * BullMQ Queue Mock Helper
 * Creates a properly mocked BullMQ Queue for unit testing
 */

import { Queue } from 'bullmq';

/**
 * Creates a mock BullMQ Queue with all necessary methods
 * @returns Mocked Queue instance
 */
export const createMockQueue = (queueName: string = 'mock-queue'): jest.Mocked<Queue> => ({
  // Core methods
  add: jest.fn().mockResolvedValue({
    id: 'mock-job-id',
    name: 'mock-job',
    data: {},
    opts: {},
    progress: 0,
    returnvalue: null,
    failedReason: null,
    timestamp: Date.now(),
    attemptsMade: 0,
    attemptsStarted: 0,
    priority: 0,
    processedOn: null,
    finishedOn: null,
    failedReason: null,
    stacktrace: [],
    delay: 0,
    repeatJobKey: null,
    removed: false,
    processedBy: null,
    updateProgress: jest.fn().mockResolvedValue(undefined),
    updateData: jest.fn().mockResolvedValue(undefined),
    log: jest.fn().mockResolvedValue(undefined),
    moveToCompleted: jest.fn().mockResolvedValue(undefined),
    moveToFailed: jest.fn().mockResolvedValue(undefined),
    isCompleted: jest.fn().mockResolvedValue(false),
    isFailed: jest.fn().mockResolvedValue(false),
    promote: jest.fn().mockResolvedValue(undefined),
    retry: jest.fn().mockResolvedValue(undefined),
    moveToDelayed: jest.fn().mockResolvedValue(undefined),
    moveToWaitingChildren: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    changeDelay: jest.fn().mockResolvedValue(undefined),
    changePriority: jest.fn().mockResolvedValue(undefined),
    getState: jest.fn().mockResolvedValue('active'),
    finished: jest.fn().mockResolvedValue(undefined),
    toKey: jest.fn().mockReturnValue(''),
    asJSON: jest.fn().mockReturnValue({}),
  }),

  // Queue management
  close: jest.fn().mockResolvedValue(undefined),
  drain: jest.fn().mockResolvedValue(undefined),
  flush: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined),
  isPaused: jest.fn().mockResolvedValue(false),
  retryJobs: jest.fn().mockResolvedValue(undefined),
  promoteJobs: jest.fn().mockResolvedValue(undefined),
  obliterate: jest.fn().mockResolvedValue(undefined),

  // Job queries
  getJobs: jest.fn().mockResolvedValue([]),
  getJobCounts: jest.fn().mockResolvedValue({
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    waiting: 0,
    waitingChildren: 0,
    paused: 0,
    repeat: 0,
  }),
  getJobCountByTypes: jest.fn().mockResolvedValue(0),
  getJobCount: jest.fn().mockResolvedValue(0),
  getWorkers: jest.fn().mockResolvedValue([]),

  // Job removal
  removeJob: jest.fn().mockResolvedValue(undefined),
  removeJobs: jest.fn().mockResolvedValue(undefined),
  clean: jest.fn().mockResolvedValue([]),

  // Event listeners (EventEmitter interface)
  on: jest.fn().mockReturnThis(),
  off: jest.fn().mockReturnThis(),
  once: jest.fn().mockReturnThis(),
  emit: jest.fn().mockReturnValue(true),
  removeAllListeners: jest.fn().mockReturnThis(),
  listeners: jest.fn().mockReturnValue([]),
  listenerCount: jest.fn().mockReturnValue(0),

  // Properties
  name: queueName,
  keys: {
    root: '',
    active: '',
    wait: '',
    paused: '',
    resumed: '',
    delayed: '',
    completed: '',
    failed: '',
    delayedStream: '',
    prioritized: '',
    marker: '',
    stalled: '',
    limiter: '',
    prioritizedMarker: '',
    events: '',
    delay: '',
  },
  toKey: jest.fn().mockReturnValue(''),
  queueKey: '',
  queueEventsKey: '',
  jobsKey: '',
  eventsKey: '',
  delayedKey: '',
  completedKey: '',
  failedKey: '',
  priorityKey: '',
  stalledKey: '',
  limiterKey: '',
  markerKey: '',
  pausedKey: '',
  metaKey: '',
  idKey: '',
  delayedStreamKey: '',
  eventsStreamKey: '',
  pcPriorityCounter: 0,
  _events: {},
  _eventsCount: 0,
  _maxListeners: undefined,
  closing: undefined,
  qualifiedName: queueName,
  _repeat: undefined,
  _jobClass: undefined,
  _keys: [],
  client: undefined,
  eventConsumer: undefined,
  scripts: undefined,
  blockClient: undefined,
  sharedClient: false,
  _closing: undefined,
  _registeredEvents: new Map(),
  _unregisterEvent: jest.fn(),
  waitUntilReady: jest.fn().mockResolvedValue(undefined),
  base64Name: Buffer.from(queueName).toString('base64'),
  clientName: jest.fn().mockReturnValue('bull'),
  getClients: jest.fn().mockResolvedValue([]),
  disconnect: jest.fn().mockResolvedValue(undefined),
  getJobState: jest.fn().mockResolvedValue('active'),
  moveJobsToWait: jest.fn().mockResolvedValue(undefined),
  retryJob: jest.fn().mockResolvedValue(undefined),
  promoteJob: jest.fn().mockResolvedValue(undefined),
  getRateLimitTtl: jest.fn().mockResolvedValue(0),
  removeDeprecatedPriorityKey: jest.fn().mockResolvedValue(undefined),
  settings: {},
  _initialization: Promise.resolve(),
  _registerEvent: jest.fn(),
} as any);

/**
 * Creates mock providers for all queue names used in the application
 * @returns Array of provider objects for NestJS testing module
 */
export const getQueueProviders = () => {
  const QUEUE_NAMES = {
    PREMIUM: 'premium',
    DISPUTES: 'disputes',
    ORDERS: 'orders',
    NOTIFICATIONS: 'notifications',
  };

  return [
    {
      provide: QUEUE_NAMES.PREMIUM,
      useValue: createMockQueue('premium'),
    },
    {
      provide: QUEUE_NAMES.DISPUTES,
      useValue: createMockQueue('disputes'),
    },
    {
      provide: QUEUE_NAMES.ORDERS,
      useValue: createMockQueue('orders'),
    },
    {
      provide: QUEUE_NAMES.NOTIFICATIONS,
      useValue: createMockQueue('notifications'),
    },
  ];
};
