// MongoDB initialization script for logging collections
db = db.getSiblingDB('nestjs_logs');

// Create collections with indexes for better performance
db.createCollection('request_logs');
db.createCollection('response_logs');
db.createCollection('error_logs');
db.createCollection('info_logs');
db.createCollection('debug_logs');
db.createCollection('performance_logs');

// Create indexes for better query performance
db.request_logs.createIndex({ timestamp: -1 });
db.request_logs.createIndex({ method: 1, url: 1 });
db.request_logs.createIndex({ userId: 1 });
db.request_logs.createIndex({ ip: 1 });

db.response_logs.createIndex({ timestamp: -1 });
db.response_logs.createIndex({ method: 1, url: 1 });
db.response_logs.createIndex({ statusCode: 1 });
db.response_logs.createIndex({ responseTime: 1 });
db.response_logs.createIndex({ userId: 1 });

db.error_logs.createIndex({ timestamp: -1 });
db.error_logs.createIndex({ level: 1 });
db.error_logs.createIndex({ context: 1 });
db.error_logs.createIndex({ userId: 1 });

db.info_logs.createIndex({ timestamp: -1 });
db.info_logs.createIndex({ level: 1 });
db.info_logs.createIndex({ context: 1 });

db.debug_logs.createIndex({ timestamp: -1 });
db.debug_logs.createIndex({ context: 1 });

db.performance_logs.createIndex({ timestamp: -1 });
db.performance_logs.createIndex({ operation: 1 });
db.performance_logs.createIndex({ duration: 1 });

print('MongoDB logging collections and indexes created successfully!');