# RosBridgeService

**File:** `src/Services/ros/ros.service.ts`

Singleton managing the WebSocket connection to ROS Bridge.
It is the single source of truth for connection state and the `ROSLIB.Ros` object consumed by all topic handlers.

---

## Purpose

- Open, maintain, and close the WebSocket connection to `rosbridge_server`.
- Broadcast `ConnectionStatus` changes to any number of subscribers (handlers, hooks, UI).
- Enforce a 10 s connection timeout so a hung handshake does not leave the app stuck in `'connecting'`.
- Provide a stable `rosConnection` reference that handlers can read at any time.

---

## Types

### `ConnectionStatus`

```typescript
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
```

| Value | When set |
|---|---|
| `'disconnected'` | Initial state, after `disconnect()`, on error, on socket close, on timeout |
| `'connecting'` | Immediately after `connect()` is called |
| `'connected'` | When the ROSLIB `connection` event fires |

---

## API

### `getInstance(): RosBridgeService` *(static)*

Returns (or lazily creates) the singleton instance.

```typescript
const service = RosBridgeService.getInstance();
```

---

### `connect(url: string): Promise<void>`

Opens a WebSocket connection to the given ROS Bridge URL.

- No-ops if already `'connecting'` or `'connected'`.
- Closes any existing socket before opening a new one.
- Starts a 10 s timeout; if the socket does not emit `connection` within that window, the status is forced to `'disconnected'` and the socket is closed.
- Resolves on `connection`, rejects on `error`.

```typescript
await RosBridgeService.getInstance().connect('ws://robot.local:9090');
```

---

### `disconnect(): void`

Clears the timeout, closes the socket, and sets status to `'disconnected'`.

```typescript
service.disconnect();
```

---

### `onStatusChange(callback): () => void`

Registers a listener that is called whenever `ConnectionStatus` changes.
Returns an **unsubscribe function** — call it to remove the listener.

```typescript
const unsubscribe = service.onStatusChange((status) => {
  console.log('ROS status:', status);
});

// later:
unsubscribe();
```

Used by `JointStateHandler` to initialise/tear down topics on connect/disconnect,
and by `useRosConnection` to push status into React state.

---

### Getters (read-only)

| Getter | Type | Description |
|---|---|---|
| `rosConnection` | `ROSLIB.Ros \| null` | The live ROSLIB instance; `null` when disconnected |
| `connectionStatus` | `ConnectionStatus` | Current status string |
| `isConnected` | `boolean` | Shorthand for `status === 'connected'` |
| `currentUrl` | `string` | The URL passed to the last `connect()` call |

---

## Connection lifecycle

```
connect(url) called
  │
  ├─ already connecting/connected → resolve immediately
  │
  └─ close existing socket (if any)
       │
       setStatus('connecting')
       startTimeout(10 s)
       createConnection()
         │
         ├─ ROSLIB 'connection' → clearTimeout → setStatus('connected') → resolve()
         ├─ ROSLIB 'error'      → clearTimeout → setStatus('disconnected') → reject()
         └─ ROSLIB 'close'      → clearTimeout → setStatus('disconnected')

timeout fires (10 s)
  └─ setStatus('disconnected') → ros.close()

disconnect() called
  └─ clearTimeout → ros.close() → setStatus('disconnected')
```

---

## Dependencies

| Import | Role |
|---|---|
| `ROSLIB` | WebSocket transport and topic primitives |
| `logger` | Conditional console logging (respects `VITE_ENABLE_LOGS`) |

---

## Design notes

- **Singleton** — all handlers and hooks share the same socket; avoids duplicate connections.
- **Status deduplication** — `setConnectionStatus` only fires listeners when the value actually changes, preventing redundant re-renders.
- **Promise + event dual API** — `connect()` returns a promise for async/await callers (e.g. a connect button handler) while the event-based `onStatusChange` serves long-lived subscribers such as topic handlers.
- **Timeout responsibility** — ROSLIB does not expose a native connection timeout; the 10 s guard is implemented manually with `setTimeout` / `clearTimeout`.
