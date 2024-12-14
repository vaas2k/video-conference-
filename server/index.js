import https from 'https';
import http from 'http';
import express from 'express';
import WebSocketServer from 'websocket';
import fs from 'fs';
import mediasoup from 'mediasoup';
import cors from 'cors'

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

const users = [];
let worker, router;
let producerTransport, consumerTransport;
let producer, consumer;

let audio_producerTransport, audio_consumerTransport;
let audio_producer, audio_consumer;

let dataProducerTransport, dataConsumerTransport;
let dataProducer, dataConsumer;

const consumers = new Map();
const producers = new Map();

const audioConsumers = new Map();
const audioProducers = new Map();

const dataConsumers = new Map();
const dataProducers = new Map();


// API ROUTES

app.post('/transport-create', async (req, res) => {

    const { send, recv } = req.body;
    try {

        if (send && !recv) {
            const { transport, params } = await createWebRtcTransport();
            producerTransport = transport;
            return res.status(200).json({
                event: 'createProducerTransport',
                data: params
            })

        }
        else if (recv && !send) {
            const { transport, params } = await createWebRtcTransport();
            consumerTransport = transport;
            return res.status(200).json({
                event: 'createConsumerTransport',
                data: params
            })
        }
    } catch (error) {
        console.log(error);
    }
});
app.get('/rtpCapabilities', (req, res) => {
    const rtpCapabilities = router.rtpCapabilities;
    return res.status(200).json({ rtpCapabilities: rtpCapabilities });
})
app.post('/transport-produce', async (req, res) => {
    const { kind, rtpParameters, appData, name } = req.body;
    try {

        producer = await producerTransport.produce({
            kind,
            rtpParameters,
        })

        console.log('Producer ID: ', producer.id, producer.kind)

        producer.on('transportclose', () => {
            console.log('transport for this producer closed ')
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


        const { rtpCapabilities, name } = req.body;
        const consumerName = name;

        console.log(consumerName);

        if (!producer) { return res.status(404).json({ error: 'No Producer Found' }) };

        let audio_producers_to_returns = [];

        for (const streamer of producers) {

            const producerName = streamer[0];
            const producer = streamer[1];

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
                    console.log('transport close from consumer')
                });
                consumer.on('producerclose', () => {
                    console.log('producer of consumer closed')
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


                audio_producers_to_returns.push(params);
            }
            else {
                console.log("CANT CONSUME");
            }

        }

        for (const cons of consumers) {
            // console.log(cons);
            console.log(`CONSUMERNAME : ${cons[0]} , PRODUCER NAME : ${cons[1][0].producerName}`);
        }

        return res.status(200).json({ params: audio_producers_to_returns });

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

    const { send, recv } = req.body;
    if (send && !recv) {
        const { transport, params } = await createWebRtcTransport();
        audio_producerTransport = transport;
        return res.status(200).json({
            event: 'createProducerTransport',
            data: params
        })

    }
    else if (recv && !send) {
        const { transport, params } = await createWebRtcTransport();
        audio_consumerTransport = transport;
        return res.status(200).json({
            event: 'createConsumerTransport',
            data: params
        })
    }

})
app.post('/transport-produce-audio', async (req, res) => {
    const { kind, rtpParameters, appData, name } = req.body;
    try {

        audio_producer = await audio_producerTransport.produce({
            kind,
            rtpParameters,
        })

        console.log('Audio Producer ID: ', audio_producer.id, audio_producer.kind)

        audio_producer.on('transportclose', () => {
            console.log('transport for this producer closed ')
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

        const { rtpCapabilities, name } = req.body;
        const consumerName = name;

        console.log(consumerName);

        if (!audio_producer) { return res.status(404).json({ error: 'No Producer Found' }) };

        let audio_producers_to_returns = [];

        for (const streamer of audioProducers) {

            const producerName = streamer[0];
            const producer = streamer[1];

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
                    console.log('transport close from consumer')
                });
                audio_consumer.on('producerclose', () => {
                    console.log('producer of consumer closed')
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
        const { name } = req.body;



        let all_producers = [];
        for (const producer of dataProducers) {
            const producerName = producer[0];
            const dataProducer = producer[1];

            if (name == producerName) continue;

            console.log(`PRODUCER : ${producerName} , ID : ${dataProducer.id}`);

            dataConsumer = await dataConsumerTransport.consumeData({ dataProducerId: dataProducer.id, label: dataProducer.label });

            dataConsumer.on('transportclose', () => { console.log("Data Consumer Transport Closed") });
            dataConsumer.on('producerclose', () => { console.log("Data Producer Closed") });

            console.log(dataConsumer);

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
    }
})


wss.on('request', (req) => {
    const socket = req.accept(null, req.origin);
    console.log('USER CONNECTED');

    socket.on('message', async (message) => {

        if (message.utf8Data) {
            const { event, data } = JSON.parse(message.utf8Data);
            console.log(event, data);

            if (event === 'name') {
                const name = data.name;
                users.push({ socket, name });
                for (const user of users) {
                    console.log(user.name);
                }

            }
            if (event === 'getRtpCapabilities') {
                const rtpCapabilities = router.rtpCapabilities;
                socket.send(JSON.stringify({
                    event: "rtpCapabilities",
                    data: rtpCapabilities
                }));
            }
            if (event === 'createTransport') {
                const { send, recv } = data;
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
                    consumerTransport = transport;
                    socket.send(JSON.stringify({
                        event: 'createConsumerTransport',
                        data: params
                    }));
                }
            }
            if (event === 'producer-connect') {
                const dtlsParameters = data.dtlsParameters;
                await producerTransport.connect({ dtlsParameters });
                console.log("Producer Transport Connected");
            }
            if (event === 'consumer-connect') {
                const dtlsParameters = data.dtlsParameters;
                await consumerTransport.connect({ dtlsParameters });
                console.log("Consumer Transport Connected");
            }
            if (event === 'producer-connect-audio') {
                const dtlsParameters = data.dtlsParameters;
                await audio_producerTransport.connect({ dtlsParameters });
                console.log("Audio Producer Transport Connected");
            }
            if (event === 'consumer-connect-audio') {
                const dtlsParameters = data.dtlsParameters;
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
                const name = data.name;
                const producer = producers.get(name);
                const audioProducer = audioProducers.get(name);
                await producer.pause();
                await audioProducer.pause();
                console.log(`PRODUCER RESUME : ${name}`);
            }
            if (event === 'resume-producer') {
                const name = data.name;
                const producer = producers.get(name);
                const audioProducer = audioProducers.get(name);
                await producer.resume();
                await audioProducer.resume();
                console.log(`PRODUCER RESUME : ${name}`);
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
                console.log('dtls Parameters recieved');
                await dataProducerTransport.connect({ dtlsParameters });
            }
            if (event === 'connect-data-consumer-transport') {
                const dtlsParameters = data.dtlsParameters;
                console.log('dtls Parameters recieved');
                await dataConsumerTransport.connect({ dtlsParameters });
            }
        }
    })

    socket.on('close', () => {
        console.log('USER DISCONNECTED');
        const userIndex = users.findIndex(user => user.socket == socket);

        if (userIndex > -1 && producers.get(users[userIndex].name)) {
            producers.delete(users[userIndex].name);
            console.log(`NAME : ${users[userIndex].name.toUpperCase()} VIDEO PRODUCER DELETED`);
        }
        if (userIndex > -1 && consumers.get(users[userIndex].name)) {
            consumers.delete(users[userIndex].name);
            console.log(`NAME : ${users[userIndex].name.toUpperCase()} VIDEO CONSUMER DELETED`);
        }

        if (userIndex > -1 && audioProducers.get(users[userIndex].name)) {
            audioProducers.delete(users[userIndex].name);
            console.log(`NAME : ${users[userIndex].name.toUpperCase()} AUDIO PRODUCER DELETED`);
        }
        if (userIndex > -1 && audioConsumers.get(users[userIndex].name)) {
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

        users.splice(userIndex, 1);

    })

})

async function createWorker() {

    worker = await mediasoup.createWorker({
        rtcMinPort: 2000,
        rtcMaxPort: 2020,
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

        const transport = await router.createWebRtcTransport({
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: '127.0.0.1',
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