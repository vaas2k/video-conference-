import {create} from "zustand";
import { v4 as uuidv4 } from 'uuid';

const wsServerUrl = process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL;


const useWebSocket = create((set, get) => ({
    socket: null,
    socketID:   null,
    initSocketConnection: (name) => {
        if (!get().socket) {
            const ws = new WebSocket(wsServerUrl);

            let socketID = null;
            ws.onopen = () => {
                console.log("WebSocket Connected");
                socketID = uuidv4();                
                ws.send(JSON.stringify({
                    event : "connect",
                    data : {
                        socketID: socketID,
                    }
                }));
                set({socketID:socketID});
            
            };
            ws.onclose = () => {console.log("WebSocket Disconnected");set({ socket: null });};
            ws.onerror = (error) => console.error("WebSocket Error:", error);
            set({ socket: ws});

        }
    },
}));
export default useWebSocket;
