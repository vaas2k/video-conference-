import https from 'https';
import http from 'http';
import express from 'express';
import WebSocketServer from 'websocket';
import fs from 'fs';
import mediasoup from 'mediasoup';
import cors from 'cors'
import { exec } from 'child_process';

const app = express();
const options = {
    key: fs.readFileSync('./ssl/key.pem', 'utf-8'),
    cert: fs.readFileSync('./ssl/cert.pem', 'utf-8'),
}


const webServer = http.createServer(options, app);
const wss = new WebSocketServer.server({
    httpServer: webServer,
    autoAcceptConnections: false
})
// app.use(express.static('public'));
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
}));

webServer.listen(8000, () => console.log(`Server Listening on PORT:8000`));

app.get('/', (req, res) => res.send('Hello Nigga'));
//---------CONFIGS ABOVE------------------------------------


// GLOBAL VARIABLES
let tranportCounts = 0;
let rtcMinPort = 2000;
let rtcMaxPort = 2020;
let announcedIp = '127.0.0.1';

const users = [];
let worker, router;
let producerTransport, consumerTransport;
let producer, consumer;

let audio_producerTransport, audio_consumerTransport;
let audio_producer, audio_consumer;

let dataProducerTransport, dataConsumerTransport;
let dataProducer, dataConsumer;

const consumerTransports = new Map();
const producersTransports = new Map();
const consumers = new Map();
const producers = new Map();

const audioConsumersTransports = new Map();
const audioProducersTransports = new Map();
const audioConsumers = new Map();
const audioProducers = new Map();

const dataConsumers = new Map();
const dataProducers = new Map();


const videoRooms = new Map();




// API ROUTES

app.post('/transport-create', async (req, res) => {

    const { send, recv, name } = req.body;
    try {

        if (send && !recv) {
            const { transport, params } = await createWebRtcTransport();
            producersTransports.set(name,transport);
            return res.status(200).json({
                event: 'createProducerTransport',
                data: params
            })

        }
        else if (recv && !send) {
            const { transport, params } = await createWebRtcTransport();
            consumerTransports.set(name, transport);
            return res.status(200).json({
                event: 'createConsumerTransport',
                data: params
            })
        }
    } catch (error) {
        console.log(error);
    }
});
app.get('/rtpCapabilities', async (req, res) => {
    const rtpCapabilities = router.rtpCapabilities;
    return res.status(200).json({ rtpCapabilities: rtpCapabilities });
})
app.post('/transport-produce', async (req, res) => {
    const { kind, rtpParameters, appData, name } = req.body;
    try {

        let producerTransport = producersTransports.get(name);
        producer = await producerTransport.produce({
            kind,
            rtpParameters,
        })

        console.log('Producer ID: ', producer.id, producer.kind)

        producer.on('transportclose', () => {
            tranportCounts--;
            console.log('VIDEO PRODUCER TRANSPORT CLOSED');
            producer.close()
        })

        producers.set(name, producer);


        return res.status(200).json({ id: producer.id });

    } catch (error) {
        console.log(error);
    }
});
app.post('/transport-consume', async (req, res) => {

    try {


        const { rtpCapabilities, name, roomID } = req.body;
        const consumerName = name;
        const consumerTransport = consumerTransports.get(name);
        // console.log(consumerTransport);

        const room = videoRooms.get(roomID);
        // console.log(room);

        let producers_to_returns = [];

        for (const streamer of room) {

            const producerName = streamer.name;
            const producer = streamer.producer;
            console.log(producerName);

            // would skip their own stream;
            if (producerName === consumerName) continue;

            console.log(`NAME : ${producerName} PRODUCER ID : ${producer.id}`);

            if (router.canConsume({ rtpCapabilities, producerId: producer.id })) {

                consumer = await consumerTransport.consume({
                    producerId: producer.id,
                    rtpCapabilities,
                    paused: true
                });

                consumer.on('transportclose', () => {
                    console.log('VIDEO CONSUMER TRANSPORT CLOSED')
                    tranportCounts--;
                });
                consumer.on('producerclose', () => {
                    console.log('VIDEO CONSUMER -> [one of the producer closed]')
                });

                const params = {
                    id: consumer.id,
                    producerId: producer.id,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                    producerName: producerName
                }

                if (consumers.has(consumerName)) {
                    // push the consumer and producer to that key 
                    const existingConsumer = consumers.get(consumerName);
                    existingConsumer.push({ consumer, producer, producerName });
                }
                else {
                    consumers.set(consumerName, [{ consumer, producer, producerName }]);
                }


                producers_to_returns.push(params);
            }
            else {
                console.log("CANT CONSUME");
            }

        }

        for (const cons of consumers) {
            // console.log(cons);
            console.log(`CONSUMERNAME : ${cons[0]} , PRODUCER NAME : ${cons[1][0].producerName}`);
        }

        return res.status(200).json({ params: producers_to_returns });

        // console.log(`Producer ID : ${producer.id}`)
        // if (router.canConsume({ rtpCapabilities, producerId: producer.id })) {

        //     consumer = await consumerTransport.consume({
        //         producerId: producer.id,
        //         rtpCapabilities, 
        //         paused: true
        //     })

        //     consumer.on('transportclose', () => {
        //         console.log('transport close from consumer')
        //     });

        //     consumer.on('producerclose', () => {
        //         console.log('producer of consumer closed')
        //     });


        //     const params = {
        //         id: consumer.id,
        //         producerId: producer.id,
        //         kind: consumer.kind,
        //         rtpParameters: consumer.rtpParameters
        //     }

        //     return res.status(200).json({ params: params });

        // }
        // else {
        //     console.log("Cant Consume");
        // }

    } catch (error) {
        console.log(error);
    }

})

app.post('/transport-create-audio', async (req, res) => {

    const { send, recv, name } = req.body;
    if (send && !recv) {
        const { transport, params } = await createWebRtcTransport();
        audioProducersTransports.set(name,transport);
        return res.status(200).json({
            event: 'createProducerTransport',
            data: params
        })

    }
    else if (recv && !send) {
        const { transport, params } = await createWebRtcTransport();
        audioConsumersTransports.set(name, transport);
        return res.status(200).json({
            event: 'createConsumerTransport',
            data: params
        })
    }

})
app.post('/transport-produce-audio', async (req, res) => {
    const { kind, rtpParameters, appData, name } = req.body;
    try {

        let audio_producerTransport = audioProducersTransports.get(name);
        audio_producer = await audio_producerTransport.produce({
            kind,
            rtpParameters,
        })

        console.log('Audio Producer ID: ', audio_producer.id, audio_producer.kind)

        audio_producer.on('transportclose', () => {
            console.log('AUDIO PRODUCER TRANSPORT CLOSED');
            tranportCounts--;
            audio_producer.close()
        })

        audioProducers.set(name, audio_producer);


        return res.status(200).json({ id: audio_producer.id });

    } catch (error) {
        console.log(error);
    }
});
app.post('/transport-consume-audio', async (req, res) => {
    try {

        const { rtpCapabilities, name, roomID } = req.body;
        const consumerName = name;
        const audio_consumerTransport = audioConsumersTransports.get(name);

        const room = videoRooms.get(roomID);
        // console.log(consumerName);

        let audio_producers_to_returns = [];

        for (const streamer of room) {

            const producerName = streamer.name;
            const producer = streamer.audio_producer;

            // would skip their own stream;
            if (producerName === consumerName) continue;

            console.log(`NAME : ${producerName} AUDIO-PRODUCER ID : ${producer.id}`);

            if (router.canConsume({ rtpCapabilities, producerId: producer.id })) {

                audio_consumer = await audio_consumerTransport.consume({
                    producerId: producer.id,
                    rtpCapabilities,
                    paused: true
                });

                audio_consumer.on('transportclose', () => {
                    tranportCounts--;
                    console.log('AUDIO CONSUMER TRANSPORT CLOSED')
                });
                audio_consumer.on('producerclose', () => {
                    console.log('AUDIO CONSUMER -> [one of the producer closed] ')
                });

                const params = {
                    id: audio_consumer.id,
                    producerId: producer.id,
                    kind: audio_consumer.kind,
                    rtpParameters: audio_consumer.rtpParameters,
                    producerName: producerName
                }

                if (audioConsumers.has(consumerName)) {
                    // push the consumer and producer to that key 
                    const existingConsumer = audioConsumers.get(consumerName);
                    existingConsumer.push({ audio_consumer, producer, producerName });
                }
                else {
                    audioConsumers.set(consumerName, [{ audio_consumer, producer, producerName }]);
                }


                audio_producers_to_returns.push(params);
            }
            else {
                console.log("CANT CONSUME");
            }

        }

        for (const cons of audioConsumers) {
            // console.log(cons);
            console.log(`CONSUMER-NAME : ${cons[0]} , AUDIO-PRODUCER NAME : ${cons[1][0].producerName}`);
        }

        return res.status(200).json({ params: audio_producers_to_returns });

    } catch (error) {
        console.log(error);
    }
})


app.post('/create-data-transport', async (req, res, next) => {

    const { send, recv } = req.body;
    if (send && !recv) {
        const { transport, params } = await createWebRtcTransport(true);
        dataProducerTransport = transport;
        return res.status(200).json({
            event: 'createProducerTransport',
            data: params
        })

    }
    else if (recv && !send) {
        const { transport, params } = await createWebRtcTransport(true);
        dataConsumerTransport = transport;
        return res.status(200).json({
            event: 'createConsumerTransport',
            data: params
        })
    }

})
app.post('/data-produce', async (req, res, next) => {
    try {
        const { sctpStreamParameters, label, appData, name } = req.body;

        dataProducer = await dataProducerTransport.produceData({
            sctpStreamParameters,
            label
        });

        dataProducer.on('transportclose', () => { console.log("Data Producer Transport Closed") });
        dataProducer.on('producerclose', () => { console.log("Data Producer Closed") });

        dataProducers.set(name, dataProducer);
        console.log(`Data Producer ID : ${dataProducer.id}`);
        return res.status(200).json({ id: dataProducer.id });
    } catch (error) {
        console.log(error);

    }
})
app.post('/data-consume', async (req, res, next) => {
    try {
        const { name, roomID } = req.body;


        const room = videoRooms.get(roomID);
        let all_producers = [];
        for (const producer of room) {
            const producerName = producer.name;
            const dataProducer = producer.dataProducer;

            if (name == producerName) continue;

            console.log(`PRODUCER : ${producerName} , ID : ${dataProducer.id}`);

            dataConsumer = await dataConsumerTransport.consumeData({ dataProducerId: dataProducer.id, label: dataProducer.label });

            dataConsumer.on('transportclose', () => { console.log("Data Consumer Transport Closed") });
            dataConsumer.on('producerclose', () => { console.log("Data Producer Closed") });

            // console.log(dataConsumer);

            const params = {
                id: dataConsumer.id,
                dataProducerId: dataProducer.id,
                producerName: producerName,
                sctpStreamParameters: dataConsumer.sctpStreamParameters, // Add SCTP parameters
                label: dataConsumer.label
            }

            all_producers.push(params);

            if (dataConsumers.has(name)) {
                const existingConsumer = dataConsumers.get(name);
                existingConsumer.push({ dataConsumer, dataProducer, producerName });
            }
            else {
                dataConsumers.set(name, [{ dataConsumer, dataProducer, producerName }]);
            }

        }
        return res.status(200).json(all_producers);

    } catch (error) {
        console.log(error);
    } finally {

    }
})


wss.on('request', (req) => {
    const socket = req.accept(null, req.origin);
    console.log('USER CONNECTED');

    socket.on('message', async (message) => {

        if (message.utf8Data) {
            const { event, data } = JSON.parse(message.utf8Data);
            console.log(event, data);

            if (event === 'join') {
                const { roomID, name } = data;
                const userIndex = users.findIndex(user => user.name === name);
                const prev = users[userIndex];
                users[userIndex] = { ...prev, roomID: roomID };

                if (!videoRooms.has(roomID)) {
                    const producer = producers.get(name);
                    const audio_producer = audioProducers.get(name);
                    const dataProducer = dataProducers.get(name);
                    videoRooms.set(roomID, [{ socket, name, producer, audio_producer, dataProducer }]);
                    console.log(`ROOM CREATED ${roomID}`)
                }
                else {

                    // need a queue for the FIFO Job for consumers;
                    const producer = producers.get(name);
                    const audio_producer = audioProducers.get(name);
                    const dataProducer = dataProducers.get(name);
                    videoRooms.get(roomID).push({ socket, name, producer, audio_producer, dataProducer });
                    console.log(`ROOM JOINED ${roomID} - USER : ${name}`);
                    const room = videoRooms.get(roomID);
                    for (const user of room) {
                        user.socket.send(JSON.stringify({
                            event: 'NEW-USER-JOINED-ROOM'
                        }))
                    }
                }

            }

            if (event === 'room-exist') {
                const { roomID } = data;
                socket.send(JSON.stringify({
                    event: 'room-exist',
                    data: {
                        room_exist: videoRooms.has(roomID) ? true : false
                    }
                }))
            }
            if (event === 'group-message') {
                const { from, message, roomID } = data;
                for (const user of videoRooms.get(roomID)) {
                    if (user.name === from) continue;
                    user.socket.send(JSON.stringify({
                        event: 'group-message',
                        data: {
                            from,
                            message
                        }
                    }))
                }
            }

            if (event === 'get-participants') {
                const { roomID } = data;
                const room = videoRooms.get(roomID);
                let participants = [];
                for (const user of room) {
                    participants.push({
                        name: user.name
                    });
                }

                socket.send(JSON.stringify({
                    event: 'get-participants',
                    data: participants
                }))
            };

            if (event === 'name') {

                if (tranportCounts >= rtcMaxPort - rtcMinPort - 1) {
                    console.log('UDP TRANSPORT PORTS -> ', tranportCounts)
                    socket.send(JSON.stringify({
                        event: 'max-users'
                    }));
                    return;
                }

                const name = data.name;
                const userIndex = users.findIndex(user => user.socket == socket);
                if (userIndex > -1) {
                    users[userIndex].name = name;
                }
                else {
                    users.push({ socket, name });
                }
                // for (const user of users) {
                //     console.log(user.name);
                // }

            }
            if (event === 'getRtpCapabilities') {
                const rtpCapabilities = router.rtpCapabilities;
                socket.send(JSON.stringify({
                    event: "rtpCapabilities",
                    data: rtpCapabilities
                }));
            }
            if (event === 'createTransport') {
                const { send, recv, name } = data;
                if (send && !recv) {
                    const { transport, params } = await createWebRtcTransport();
                    producerTransport = transport;
                    socket.send(JSON.stringify({
                        event: 'createProducerTransport',
                        data: params
                    }));
                }
                else if (recv && !send) {
                    const { transport, params } = await createWebRtcTransport();
                    // consumerTransport = transport;
                    // storing the transport

                    socket.send(JSON.stringify({
                        event: 'createConsumerTransport',
                        data: params
                    }));
                }
            }
            if (event === 'producer-connect') {
                const {dtlsParameters,name} = data;
                let producerTransport = producersTransports.get(name);
                await producerTransport.connect({ dtlsParameters });
                console.log("Producer Transport Connected");
            }
            if (event === 'consumer-connect') {
                const { dtlsParameters, name } = data;
                const consumerTransport = consumerTransports.get(name);
                await consumerTransport.connect({ dtlsParameters });
                console.log("Consumer Transport Connected");
            }
            if (event === 'producer-connect-audio') {
                const {dtlsParameters,name} = data;
                let audio_producerTransport = audioProducersTransports.get(name);
                await audio_producerTransport.connect({ dtlsParameters });
                console.log("Audio Producer Transport Connected");
            }
            if (event === 'consumer-connect-audio') {
                const { dtlsParameters, name } = data;
                const audio_consumerTransport = audioConsumersTransports.get(name)
                await audio_consumerTransport.connect({ dtlsParameters });
                console.log("Audio Consumer Transport Connected");
            }
            if (event === 'resume-consume') {
                const name = data.name;
                const producerId = data.producerId;
                try {
                    for (const cons of consumers.get(name)) {
                        if (cons.producer.id === producerId) {
                            console.log(`RESUMED CONSUMER : ${name} AND PRODUCER : ${cons.producerName}`);
                            await cons.consumer.resume();
                        }
                    }
                } catch (error) {
                    console.log(error);
                }
            }
            if (event === 'pause-consume') {
                const name = data.name;
                const producerId = data.producerId;
                try {
                    for (const cons of consumers.get(name)) {
                        if (cons.producer.id === producerId) {
                            cons.consumer.pause()
                                .then(() => {
                                    console.log(`PAUSED CONSUMER : ${name} AND PRODUCER : ${cons.producerName}`);
                                })

                        }
                    }
                } catch (error) {
                    console.log(error);
                }
            }
            if (event === 'resume-consume-audio') {
                const name = data.name;
                const producerId = data.producerId;
                try {
                    for (const cons of audioConsumers.get(name)) {
                        if (cons.producer.id === producerId) {
                            console.log(`RESUMED CONSUMER : ${name} AUDIO PRODUCER : ${cons.producerName}`);
                            await cons.audio_consumer.resume();
                        }
                    }
                } catch (error) {
                    console.log(error);
                }
            }
            if (event === 'pause-consume-audio') {
                const name = data.name;
                const producerId = data.producerId;
                try {
                    for (const cons of audioConsumers.get(name)) {
                        if (cons.producer.id === producerId) {
                            cons.audio_consumer.pause()
                                .then(() => {
                                    console.log(`PAUSED CONSUMER : ${name} AUDIO PRODUCER : ${cons.producerName}`);
                                })
                        }
                    }
                } catch (error) {
                    console.log(error);
                }
            }
            if (event === 'pause-producer') {
                const { name, video, audio } = data;
                if (video) {
                    const producer = producers.get(name);
                    await producer.pause();
                    console.log(`PAUSE VIDEO  : ${name}`);
                }
                if (audio) {
                    const audioProducer = audioProducers.get(name);
                    await audioProducer.pause();
                    console.log(`PAUSE AUDIO : ${name}`);
                }
            }
            if (event === 'resume-producer') {
                const { name, video, audio } = data;
                if (video) {
                    const producer = producers.get(name);
                    await producer.resume();
                    console.log(`PRODUCER VIDEO RESUME : ${name}`);
                }
                if (audio) {
                    const audioProducer = audioProducers.get(name);
                    await audioProducer.resume();
                    console.log(`PRODUCER AUDIO RESUME : ${name}`);
                }
            }
            if (event === 'resume-data-consumer') {
                const name = data.name;
                const dataProducerId = data.dataProducerId;
                for (const cons of dataConsumers.get(name)) {
                    if (cons.dataProducer.id === dataProducerId) {
                        cons.dataConsumer.resume()
                            .then(() => { console.log(`RESUMED DATA CONSUMER : ${name} AND PRODUCER : ${cons.producerName}`); });
                    }
                }
            }
            if (event === 'connect-data-producer-transport') {
                const dtlsParameters = data.dtlsParameters;
                await dataProducerTransport.connect({ dtlsParameters });
            }
            if (event === 'connect-data-consumer-transport') {
                const dtlsParameters = data.dtlsParameters;
                await dataConsumerTransport.connect({ dtlsParameters });
            }
        }
    })

    socket.on('close', () => {
        console.log('USER DISCONNECTED');
        const userIndex = users.findIndex(user => user.socket == socket);

        if (userIndex > -1 && users[userIndex].roomID) {
            const roomID = users[userIndex].roomID;
            const roomParticipants = videoRooms.get(roomID);

            if (roomParticipants) {
                for (const room of roomParticipants) {
                    if (users[userIndex].name === room.name) continue;
                    room.socket.send(
                        JSON.stringify({
                            event: "USER-LEFT-ROOM",
                            data: { name: users[userIndex].name }
                        })
                    );
                }

                const updatedParticipants = roomParticipants.filter(
                    (participant) => participant.name !== users[userIndex].name
                );

                if (updatedParticipants.length > 0) {
                    videoRooms.set(roomID, updatedParticipants);
                } else {
                    videoRooms.delete(roomID);
                }

                users[userIndex].roomID = null;
            }
        }


        if (userIndex > -1 && producers.get(users[userIndex].name)) {
            const prod = producers.get(users[userIndex].name);
            prod.close();
            
            producersTransports.delete(users[userIndex].name);
            producers.delete(users[userIndex].name);
            console.log(`NAME : ${users[userIndex].name.toUpperCase()} VIDEO PRODUCER DELETED`);

        }
        if (userIndex > -1 && consumers.get(users[userIndex].name)) {
            for (const cons of consumers.get(users[userIndex].name)) { cons.consumer.close(); }
            consumerTransports.get(users[userIndex].name).close();

            consumers.delete(users[userIndex].name);
            console.log(`NAME : ${users[userIndex].name.toUpperCase()} VIDEO CONSUMER DELETED`);

        }

        if (userIndex > -1 && audioProducers.get(users[userIndex].name)) {
            const audioProd = audioProducers.get(users[userIndex].name);
            audioProd.close();
        
            audioProducersTransports.clear(users[userIndex].name);
            audioProducers.delete(users[userIndex].name);
            console.log(`NAME : ${users[userIndex].name.toUpperCase()} AUDIO PRODUCER DELETED`);

        }
        if (userIndex > -1 && audioConsumers.get(users[userIndex].name)) {
            for (const cons of audioConsumers.get(users[userIndex].name)) { cons.audio_consumer.close(); }
            audioConsumersTransports.get(users[userIndex].name).close();
            audioConsumers.delete(users[userIndex].name);
            console.log(`NAME : ${users[userIndex].name.toUpperCase()} AUDIO CONSUMER DELETED`);

        }
        if (userIndex > -1 && dataProducers.get(users[userIndex].name)) {
            dataProducers.delete(users[userIndex].name);
            console.log(`NAME : ${users[userIndex].name.toUpperCase()} DATA PRODUCER DELETED`);

        }
        if (userIndex > -1 && dataConsumers.get(users[userIndex].name)) {
            dataConsumers.delete(users[userIndex].name);
            console.log(`NAME : ${users[userIndex].name.toUpperCase()} DATA CONSUMER DELETED`);

        }
        if (userIndex > -1) {
            for (const rooms of videoRooms) {
                if (users[userIndex].name === rooms[1].name) {
                    rooms[1].delete(users[userIndex].name);
                    console.log(`NAME : ${users[userIndex].name.toUpperCase()} LEFT ROOM : ${rooms[1].name}`);
                }
            }

        }
        users.splice(userIndex, 1);
    })


})

async function createWorker() {

    worker = await mediasoup.createWorker({
        rtcMinPort: rtcMinPort,
        rtcMaxPort: rtcMaxPort
    });

    console.log(`Worker PID : ${worker.pid}`);

    worker.on('died', () => {
        console.error('mediasoup worker died, exiting in 2 seconds...');
        setTimeout(() => process.exit(1), 2000);
    });

    return worker;
}

const mediaCodecs = [
    {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
            'x-google-start-bitrate': 1000,
        },
    },
]
worker = await createWorker();
router = await worker.createRouter({ mediaCodecs });
console.log(`Router ID : ${router.id}`);


const createWebRtcTransport = async (data) => {

    try {

        const maxPorts = rtcMaxPort - rtcMinPort;
        if (tranportCounts >= maxPorts) {

            console.log('max tranports reached');
            exec("pm2 restart index", (err, stdout, stderr) => {
                if (err) console.error("Error restarting app:", err.message);
                else console.log(stdout || stderr);
            });

        }
        const transport = await router.createWebRtcTransport({
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp
                },

            ],
            enableTcp: true,
            enableUdp: true,
            preferUdp: true,
            enableSctp: true,
            sctpParameters: {
                numStreams: { OS: 1024, MIS: 1024 },
            },
        });
        tranportCounts++;
        console.log(tranportCounts);

        console.log(`Transport ID : ${transport.id}`);

        transport.on('dtlsstatechange', (dtlsState) => {
            if (dtlsState === 'closed') transport.close();
        });
        transport.on('close', () => {
            console.log("Transport Closed");
        });

        const params = {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
            sctpParameters: data ? transport.sctpParameters : null
        };

        return { transport, params };
    } catch (error) {
        console.log(error);
    }
}





