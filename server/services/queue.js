const queue = [];

const Queue = {
    queue:queue,
    enqueue: (item) => {
        queue.push(item);
    },
    dequeue: () => {
        return queue.shift();
    },
    isEmpty: () => {
        return queue.length === 0;
    },
    front: () => {
        return queue[0];
    },
    tail: () => {
        const end = queue.length - 1;
        return queue[end];
    },
    getQueue: () => {
        return queue;
    },
    emptyQueue : () => {
        queue = [];
    }
}

export default Queue;