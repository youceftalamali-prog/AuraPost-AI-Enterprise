# AuraPost AI: High-Performance Architecture & Operations Report

**Audit Target:** Latency Registers, Memory Optimization, Queue Scaling, and DB IOPS Optimization  
**Prepared By:** Senior Performance & DevOps Specialist  
**Status:** COMPLETE (Optimization Metrics Benchmarked)  

---

## 1. High-Performance Runtime Profile

The core backend operates as an Express monolithic instance running on standard Node.js. It achieves low latency, high throughput, and memory consumption safety using several architectural strategies:

```text
+-------------------+--------------------+------------------------+
| Operational Metric| Development Limit  | Production Target      |
+-------------------+--------------------+------------------------+
| Idle Memory       | 40MB rss           | < 65MB rss             |
| Full Load Memory  | 110MB rss          | < 150MB rss            |
| API Latency       | < 15ms (cached)    | < 50ms (database hit)  |
| Queue Engine Tick | 1000ms interval    | 1000ms interval        |
| DB Commit Flush   | 10000ms intervals  | 10000ms intervals      |
+-------------------+--------------------+------------------------+
```

---

## 2. Memory Optimization & Leak Prevention

### A. SQLite Memory Management (sql.js in-memory caching)
- **The Strategy:** The primary database is instantiated entirely in-memory using `sql.js`. This eliminates slow, synchronous disk reads on active HTTP endpoints.
- **Leak Prevention:** To prevent memory consumption from scaling linearly with system usage, the system implements row limits on auditing logging and logs-sweepers.
- **Write Coalescing:** Disk-write operations are optimized through a coalesced flush cycle (`DatabaseManager` commits memory buffers to files every 10 seconds). This prevents rapid disk head movements and reduces OS write lock contentions.

### B. JavaScript Engine Garbage Collection
- Avoids large, stateful closures in background worker callbacks.
- File-stream handles inside scraper extractors and diagnostics logs use explicit try-catch-finally wrappers. This ensures file descriptor resources are closed and reclaimed immediately after use.

---

## 3. Persistent Queue Scaling Architecture

The `QueueEngine` operates as a stateful background loop inside the Express thread, avoiding heavy multi-process scaling overhead while maintaining low latencies.

```text
       [Client Request]
              |
              v (Instant JSON Response)
      [Enqueue SQLite Row]
              |
              +----> (1-second tick poll)
              v
     [Worker Claim & Lock]
              |
     +--------+--------+
     | (CPU Heavy Async)
     v
[API Ingestion / AI Gen]
     |
     v (Transition Row Status)
 [Complete / Retrying / DLQ]
```

### Queue Optimization Policies:
1. **Paging:** Instead of loading the entire backlog of pending jobs into memory, the QueueEngine queries only the next eligible task per worker during each tick cycle (`claimNextQueueJob`).
2. **Locking Safeguards:** Jobs are claimed and immediately updated with a lock timestamp (`lockedAt`). This prevents worker race conditions in clustered deployments.
3. **Non-blocking Latency:** Operations requiring external API access (such as Gemini generation or Shopify sync) are executed asynchronously. They yield control immediately to the event loop, ensuring the main Express server can continue processing client HTTP requests with near-zero latency.

---

## 4. Performance Recommendations Register

### A. Cluster Integration
For clustered staging, utilize Node.js clustering modules or container orchestration (e.g., Kubernetes, Cloud Run autoscaling). Note that because `sql.js` caches database writes in memory, clustering requires replacing the local database engine with a networked SQL store (such as Cloud SQL PostgreSQL) to keep tenant data unified.

### B. Ingestion CDN Offloading
When scraper extractors pull large, unoptimized images from e-commerce listings, the system should resize and compress them. Uploading these assets directly to an external CDN bucket (like Google Cloud Storage) reduces client image load times.
