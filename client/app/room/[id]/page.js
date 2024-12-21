'use client';
import useWebSocket from "@/store/useWebSocket";
import React, { use, useEffect, useRef, useState } from "react";
import mediasoup, { Device } from 'mediasoup-client';
import axios from "axios";
import { Mic, Video, Phone, MessageSquare, Users, MoreVertical, MonitorUp, MousePointerClick, ConstructionIcon, VideoIcon, VideoOffIcon, Mic2, MicVocal, MicIcon, MicOff, VideoOff, Maximize, X, Clipboard, ClipboardCheck } from 'lucide-react';
import { useRouter, useSearchParams } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";



const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

const api = axios.create({
    baseURL: serverUrl
});

export default function Page({ params: param }) {


    const router = useRouter();
    const searchParams = useSearchParams();

    const audio = searchParams.get('audio') === 'true';
    const video = searchParams.get('video') === 'true';

    const param_id = decodeURIComponent(param.id);
    const [roomID, setRoomID] = useState(param_id.split('-')[1]);
    const [username, setUserName] = useState(param_id.split('-')[0]);

    const [showParticipants, setShowParticipants] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');

    const initSocketConnection = useWebSocket(state => state.initSocketConnection);
    const socket = useWebSocket(state => state.socket);

    const videoRef = useRef(null);
    const screenRef = useRef(null);
    const remoteRef = useRef(null);
    const videoTrack = useRef(null);
    const audioTrack = useRef(null);
    const screenTrack = useRef(null);
    const rtpCapabilities = useRef(null);
    const deviceRef = useRef(null);
    const producerTransport = useRef(null);
    const consumerTransport = useRef(null);
    const producer = useRef(null);
    const audioProducer = useRef(null);
    const audioProducerTransport = useRef(null);
    const audioConsumerTransport = useRef(null);

    const dataProducerTransport = useRef(null);
    const dataConsumerTransport = useRef(null);
    const dataProducer = useRef(null);
    const dataConsumer = useRef(null);
    const dataDeviceRef = useRef(null);
    const nameRef = useRef(null);
    const [streams, setStreams] = useState([]);
    const [remoteStreams, setRemoteStreams] = useState([]);
    const [AudioRemoteStreams, setAudioRemoteStreams] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [name, setName] = useState("");
    const [nameExist, setNameExist] = useState(false);
    const [params, setParams] = useState({
        encodings: [
            {
                rid: 'r0',
                maxBitrate: 100000,
                scalabilityMode: 'S1T3',
            },
            {
                rid: 'r1',
                maxBitrate: 300000,
                scalabilityMode: 'S1T3',
            },
            {
                rid: 'r2',
                maxBitrate: 900000,
                scalabilityMode: 'S1T3',
            },
        ],
        codecOptions: {
            videoGoogleStartBitrate: 1000
        },
        track: null
    });
    const [audioParams, setAudioParams] = useState({
        codecOptions: {
            opusStereo: true, // Enable stereo if needed
            opusDtx: true,    // Enable Discontinuous Transmission
        },
        track: null, // Set this to the audio track
    });

    const [remotevideoState, setRemoteVideoState] = useState([]);
    const [remoteaudioState, setRemoteAudioState] = useState([]);
    const [ownVideoState, setOwnVideoState] = useState(true);
    const [ownAudioState, setOwnAudioState] = useState(true);
    const [isScreenShared, setIsScreenShare] = useState(false);
    const [enlargedStream, setEnlargedStream] = useState(null);
    const lastMsg = useRef(null);
    const consumeRef = useRef(null);
    const [copied, setCopied] = useState(false);




    const handleCopyClick = () => {
        navigator.clipboard.writeText(roomID)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
            })
            .catch((error) => {
                console.error('Failed to copy: ', error);
            });
    };

    const handleEnlargeStream = (producerId) => {
        setEnlargedStream(producerId);
    };

    const handleCloseEnlargedStream = () => {
        setEnlargedStream(null);
    };

    function handleSetName() {
        if (nameRef.current) return;
        if (socket === null) { router.push('/'); return; }
        nameRef.current = username;
        socket.send(JSON.stringify({
            event: "name",
            data: {
                name: username
            }
        }));
        setNameExist(true);
    }
    function handleMessage(message) {

        // if (dataProducer.current.readyState !== 'open') return;
        // dataProducer.current.send(JSON.stringify({
        //     from: nameRef.current,
        //     message: message
        // }));
        socket.send(JSON.stringify({
            event: 'group-message',
            data: {
                from: nameRef.current,
                message: message,
                roomID: roomID
            }
        }))
        setMessages((messages) => [...messages, { from: nameRef.current, message: message }]);
    }


    useEffect(() => {
        handleSetName();
        if (socket && nameExist) {
            produce();
        }
    }, [socket, roomID, username, nameExist]);;

    useEffect(() => {

        if (socket) {

            socket.addEventListener('message', (message) => {

                const { event, data } = JSON.parse(message.data);

                if (event === 'rtpCapabilities') {
                    console.log('Recievied RTP Capabilities');
                    rtpCapabilities.current = data;
                }

                if (event === 'createProducerTransport') {
                    const params = data;
                    console.log('Recieved ICE,DTLS,RTP CANDIDATES/PARAMETERS');

                    producerTransport.current = deviceRef.current.createSendTransport(params);

                    producerTransport.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
                        console.log("SENDING DTLS PARAMETERS");

                        try {

                            await socket.send(JSON.stringify({
                                event: 'producer-connect',
                                data: {
                                    dtlsParameters
                                }
                            }));

                            callback();
                        } catch (error) {
                            errback(error);
                        }

                    })

                    producerTransport.current.on('produce', async (parameters, callback, errback) => {

                        try {

                            console.log("SENDING ICE/RTP CANDIDATES AND PARAMETERS");

                            const res = await api.post('/transport-produce', {
                                rtpParameters: parameters.rtpParameters,
                                kind: parameters.kind,
                                appData: parameters.appData,
                                name: nameRef.current
                            });

                            if (res.status === 200) {
                                const id = res.data.id;
                                callback({ id });
                            }


                        } catch (error) {
                            console.log(error);
                            errback(error);
                        }

                    })

                };

                if (event === 'createConsumerTransport') {

                    const params = data;

                    consumerTransport.current = deviceRef.current.createRecvTransport(params);

                    consumerTransport.current.on('connect', async ({ dtlsParameters }, callback, errback) => {

                        console.log("dtlsParameters");
                        try {
                            await socket.send(JSON.stringify({
                                event: 'consumer-connect',
                                data: {
                                    dtlsParameters
                                }
                            }));


                            callback();
                        } catch (error) {
                            console.log(error);
                            errback(error);
                        }

                    })
                }

                if (event === 'get-participants') {
                    const new_participants = data;
                    if (participants === new_participants) {
                        console.log('Participants are the same');
                        return;
                    }
                    setParticipants(new_participants);
                };

                if (event === 'NEW-USER-JOINED-ROOM') {
                    if (consumeRef.current === true) {
                        console.log("Already Called Consumed");
                        //  consumeMore(roomID);
                        consumeRef.current = false;
                    } else {
                        consumeRef.current = true;
                        consume(roomID);
                    }
                }

                if (event === 'USER-LEFT-ROOM') {
                    if (consumeRef.current === true) {
                        console.log("Already Called Consumed");
                        //  consumeMore(roomID);
                        consumeRef.current = false;
                    } else {
                        consumeRef.current = true;
                        consume(roomID);
                    }
                }

                if (event === 'group-message') {
                    if (lastMsg.current === true) {
                        lastMsg.current = false;
                        return;
                    }
                    else {
                        lastMsg.current = true;
                        setMessages(prev => [...prev, data]);
                    }
                }

                if (event === 'max-users') {
                    toast.error('NO ROOM FOUND');
                    window.location.reload();
                }
            })

        }

    }, [socket]);

    async function produce() {
        const { vidTrack, audTrack } = await getLocalVideo();
        await getRtpCapabilities();
        await createTransport(true, false);
        await connectSendTransport(vidTrack);
        await createAudioTransport(true, false);
        await connectAudioSendTransport(audTrack);
        // await createDataTransport(true, false);
        // await connectDataProduceTranport();
        // only creating the transport for both audio and video and storing the transport for resuse later
        // consume will be called only when some user join the same room
        await createTransport(false, true);
        await createAudioTransport(false, true);
    }
    async function consume(roomID) {
        setAudioRemoteStreams([]);
        setRemoteStreams([]);
        // await getRtpCapabilities();
        await connectRecvTransport(roomID);
        await connectAudioRecvTransport(roomID);
        // await createDataTransport(false, true);
        // await connectDataConsumeTransport(roomID);
    }

    async function getLocalVideo() {

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        });

        let vidTrack, audTrack;
        stream.getTracks().forEach((track) => {
            if (track.kind === 'audio') {
                audioTrack.current = track;
                audTrack = track;
                setAudioParams({
                    ...audioParams,
                    track
                })
            }
            else if (track.kind === 'video') {
                videoTrack.current = track;
                vidTrack = track;
                setParams({
                    ...params,
                    track
                });
            };

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

        })
        return { vidTrack, audTrack };

    }

    async function getRtpCapabilities() {

        try {
            if (rtpCapabilities.current || deviceRef.current) return;

            const req = await api.get('/rtpCapabilities');

            if (req.status === 200) {

                // console.log(req.data.rtpCapabilities);
                rtpCapabilities.current = req.data.rtpCapabilities;
                deviceRef.current = new Device();

                await deviceRef.current.load({
                    routerRtpCapabilities: rtpCapabilities.current,
                });
                console.log("Device Created");

            }

        } catch (error) {
            console.log(error);
        }

    }
    async function createDevice() {
        try {

            deviceRef.current = new Device();
            await deviceRef.current.load({
                routerRtpCapabilities: rtpCapabilities.current
            })

            console.log('RTP Capabilities', deviceRef.current)

        } catch (error) {
            console.log(error)
            if (error.name === 'UnsupportedError')
                console.warn('browser not supported')
        }
    }

    // VIDEO TRANSPORT
    async function createTransport(send, recv) {
        const req = await api.post('/transport-create', {
            send,
            recv,
            name: nameRef.current
        });
        if (req.status === 200) {
            const { event, data } = req.data;
            // console.log(data);
            //CREATE PRODUCER-TRANSPORT
            if (event === 'createProducerTransport') {
                const params = data
                producerTransport.current = deviceRef.current.createSendTransport(params);

                console.log('PRODUCER TRANSPORT CREATED');

                producerTransport.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
                    console.log("dtlsParameters");

                    try {

                        await socket.send(JSON.stringify({
                            event: 'producer-connect',
                            data: {
                                dtlsParameters
                            }
                        }));

                        callback();
                    } catch (error) {
                        errback(error);
                    }

                })

                producerTransport.current.on('produce', async (parameters, callback, errback) => {

                    try {

                        console.log("ice/rtp parameters");

                        const res = await api.post('/transport-produce', {
                            rtpParameters: parameters.rtpParameters,
                            kind: parameters.kind,
                            appData: parameters.appData,
                            name: nameRef.current
                        });

                        if (res.status === 200) {
                            const id = res.data.id;
                            callback({ id });
                        }


                    } catch (error) {
                        console.log(error);
                        errback(error);
                    }

                })
            }

            // CREATE CONSUMER-TRANSPORT
            if (event === 'createConsumerTransport') {
                const params = data;
                console.log('Consumer Params recv');

                consumerTransport.current = deviceRef.current.createRecvTransport(params);

                consumerTransport.current.on('connect', async ({ dtlsParameters }, callback, errback) => {

                    console.log("dtlsParameters");
                    try {
                        await socket.send(JSON.stringify({
                            event: 'consumer-connect',
                            data: {
                                dtlsParameters,
                                name: nameRef.current
                            }
                        }));


                        callback();
                    } catch (error) {
                        console.log(error);
                        errback(error);
                    }

                })
            }
        }

        return;
    }
    async function connectSendTransport(vidTrack) {
        try {

            producer.current = await producerTransport.current.produce({
                encodings: [
                    {
                        rid: 'r0',
                        maxBitrate: 100000,
                        scalabilityMode: 'S1T3',
                    },
                    {
                        rid: 'r1',
                        maxBitrate: 300000,
                        scalabilityMode: 'S1T3',
                    },
                    {
                        rid: 'r2',
                        maxBitrate: 900000,
                        scalabilityMode: 'S1T3',
                    },
                ],
                codecOptions: {
                    videoGoogleStartBitrate: 1000
                },
                track: vidTrack
            })

            producer.current.on('trackended', () => {
                console.log('track ended')
                // close video track
            })
            producer.current.on('transportclose', () => {
                console.log('transport ended')
                // close video track
            })

            video ? null : handleOwnProduceState(true, false);
            console.log('Producer Transport Created');

        } catch (error) { console.log(error); }
    }
    async function connectRecvTransport(roomID) {
        try {
            const res = await api.post('/transport-consume', {
                rtpCapabilities: deviceRef.current.rtpCapabilities,
                name: nameRef.current,
                roomID: roomID
            });

            if (res.status === 200) {
                for (let i = 0; i < res.data.params.length; i++) {
                    const params = res.data.params[i];
                    const consumer = await consumerTransport.current.consume({
                        id: params.id,
                        producerId: params.producerId,
                        kind: params.kind,
                        rtpParameters: params.rtpParameters
                    });

                    const { track } = consumer;
                    const remoteStream = new MediaStream([track]);

                    // Update state with the new stream
                    setRemoteStreams((prevStreams) => [
                        ...prevStreams,
                        {
                            stream: remoteStream,
                            producerName: params.producerName,
                            producerId: params.producerId,
                            videoState: true,
                            audioState: true,
                        }
                    ]);

                    // Resume consuming the stream
                    await socket.send(JSON.stringify({
                        event: 'resume-consume',
                        data: {
                            name: nameRef.current,
                            producerId: params.producerId
                        }
                    }));
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    // AUDIO TRANSPORT
    async function createAudioTransport(send, recv) {
        const req = await api.post('/transport-create-audio', {
            send,
            recv,
            name: nameRef.current
        });
        if (req.status === 200) {
            const { event, data } = req.data;
            // console.log(data);
            //CREATE PRODUCER-TRANSPORT
            if (event === 'createProducerTransport') {
                const params = data
                audioProducerTransport.current = deviceRef.current.createSendTransport(params);

                console.log(' AUDIO PRODUCER TRANSPORT CREATED');

                audioProducerTransport.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
                    console.log("audio dtlsParameters");

                    try {

                        await socket.send(JSON.stringify({
                            event: 'producer-connect-audio',
                            data: {
                                dtlsParameters,

                            }
                        }));

                        callback();
                    } catch (error) {
                        errback(error);
                    }

                })

                audioProducerTransport.current.on('produce', async (parameters, callback, errback) => {

                    try {

                        console.log("audio ice/rtp parameters");

                        const res = await api.post('/transport-produce-audio', {
                            rtpParameters: parameters.rtpParameters,
                            kind: parameters.kind,
                            appData: parameters.appData,
                            name: nameRef.current
                        });

                        if (res.status === 200) {
                            const id = res.data.id;
                            callback({ id });
                        }


                    } catch (error) {
                        console.log(error);
                        errback(error);
                    }

                })
            }
            // CREATE CONSUMER-TRANSPORT
            if (event === 'createConsumerTransport') {
                const params = data;
                console.log('Audio Consumer Params');

                audioConsumerTransport.current = deviceRef.current.createRecvTransport(params);

                audioConsumerTransport.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
                    try {
                        await socket.send(JSON.stringify({
                            event: 'consumer-connect-audio',
                            data: {
                                dtlsParameters,
                                name: nameRef.current
                            }
                        }));


                        callback();
                    } catch (error) {
                        console.log(error);
                        errback(error);
                    }

                })
            }
        }

        return;
    }
    async function connectAudioSendTransport(audTrack) {
        try {

            audioProducer.current = await audioProducerTransport.current.produce({
                codecOptions: {
                    opusStereo: true, // Enable stereo if needed
                    opusDtx: true,    // Enable Discontinuous Transmission
                    audioGoogleNoiseSuppression: true,
                    audioGoogleAutomaticGainControl: true,
                    audioGoogleEchoCancellation: true
                },
                track: audTrack
            })

            audioProducer.current.on('trackended', () => {
                console.log('track ended')
                // close video track
            })
            audioProducer.current.on('transportclose', () => {
                console.log('transport ended')
                // close video track
            })

            socket.send(JSON.stringify({
                event: 'join',
                data: {
                    roomID: roomID,
                    name: username
                }
            }))

            audio ? null : handleOwnProduceState(false, true);
            console.log("Audio Produced");

        } catch (error) { console.log(error); }
    }
    async function connectAudioRecvTransport(roomID) {
        setAudioRemoteStreams([]);
        try {
            const res = await api.post('/transport-consume-audio', {
                rtpCapabilities: deviceRef.current.rtpCapabilities,
                name: nameRef.current,
                roomID: roomID
            });

            if (res.status === 200) {
                const params = res.data.params;

                for (let i = 0; i < params.length; i++) {
                    const consumer = await audioConsumerTransport.current.consume({
                        id: params[i].id,
                        producerId: params[i].producerId,
                        kind: params[i].kind,
                        rtpParameters: params[i].rtpParameters
                    });

                    const { track } = consumer;
                    const remoteStream = new MediaStream([track]);
                    // Update state with the new stream
                    setAudioRemoteStreams((prevStreams) => [
                        ...prevStreams,
                        {
                            stream: remoteStream,
                            producerName: params[i].producerName,
                            producerId: params[i].producerId,
                            state: true
                        }
                    ]);
                    // Resume consuming the stream
                    await socket.send(JSON.stringify({
                        event: 'resume-consume-audio',
                        data: {
                            name: nameRef.current,
                            producerId: params[i].producerId
                        }
                    }));
                    consumeRef.current = false;

                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    // DATA CHANNEL TRANSPORT 
    async function createDataTransport(send, recv) {
        try {
            const res = await api.post('/create-data-transport', {
                send,
                recv
            });

            if (res.status === 200) {
                const { event, data } = res.data;
                const params = data;
                console.log('Data Tranport Created');
                // console.log(params);

                if (event === 'createProducerTransport') {

                    dataProducerTransport.current = deviceRef.current.createSendTransport(params);

                    dataProducerTransport.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
                        try {
                            console.log(dtlsParameters);
                            await socket.send(JSON.stringify({
                                event: 'connect-data-producer-transport',
                                data: {
                                    dtlsParameters: dtlsParameters,
                                }
                            }));
                            callback();
                        } catch (error) {
                            errback(error);
                        }
                    });

                    dataProducerTransport.current.on('producedata', async (parameters, callback, errback) => {
                        console.log(parameters);
                        try {
                            const res = await api.post('/data-produce', {
                                sctpStreamParameters: parameters.sctpStreamParameters,
                                appData: parameters.appData,
                                label: parameters.label,
                                name: nameRef.current
                            });

                            if (res.status === 200) {
                                const id = res.data.id;
                                callback({ id });
                            }
                        } catch (error) {
                            console.log(error);
                            errback(error);
                        }
                    })
                }
                if (event === 'createConsumerTransport') {
                    dataConsumerTransport.current = deviceRef.current.createRecvTransport(params);

                    dataConsumerTransport.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
                        try {
                            console.log(dtlsParameters);
                            await socket.send(JSON.stringify({
                                event: 'connect-data-consumer-transport',
                                data: {
                                    dtlsParameters: dtlsParameters,
                                }
                            }));
                            callback();
                        } catch (error) {
                            errback(error);
                        }
                    });
                }

            }

        } catch (error) {
            console.log(error);
        }
    }
    async function connectDataProduceTranport() {
        try {

            dataProducer.current = await dataProducerTransport.current.produceData({
                label: 'chat'
            });

            dataProducer.current.on('open', () => {
                console.log('Data Channel Opened');
            })
            dataProducer.current.on('close', () => {
                console.log('Data Channel Closed');
            })
            console.log(dataProducer.current);

            socket.send(JSON.stringify({
                event: 'join',
                data: {
                    roomID: roomID,
                    name: username
                }
            }))

        } catch (error) {
            console.log(error);
        }
    }
    async function connectDataConsumeTransport(roomID) {
        try {

            const res = await api.post('/data-consume', {
                name: nameRef.current,
                roomID: roomID
            });

            if (res.status === 200) {
                const parameters = res.data;

                for (const params of parameters) {

                    console.log(params);

                    var dataConsumer = await dataConsumerTransport.current.consumeData({
                        id: params.id,
                        dataProducerId: params.dataProducerId,
                        sctpStreamParameters: params.sctpStreamParameters,
                        label: params.label,
                    });

                    // Setup event handlers for the data channel

                    dataConsumer.on('open', () => {
                        console.log(`Data Channel Opened with : ${params.producerName}`)
                    })

                    dataConsumer.on('close', () => {
                        console.log("Data channel is close and not ready to receive messages.");
                    })

                    dataConsumer.on('message', (message) => {
                        const data = JSON.parse(message);
                        console.log(data);
                        setMessages(prevMessages => [...prevMessages, data]);

                    })

                    console.log("Data Consumer Created:", dataConsumer);

                }
            }
            consumeRef.current = false;
            // socket.send(JSON.stringify({
            //     event : "consumed-dequeue-me"
            // }))
        } catch (error) {
            console.log(error);
        }
    }

    // MODIF PRODUCING
    async function handleOwnProduceState(video, audio) {

        if (video && ownVideoState) {
            socket.send(JSON.stringify({
                event: 'pause-producer',
                data: {
                    name: nameRef.current,
                    video,
                    audio
                }
            }));
            setOwnVideoState(false);
        }
        if (video && !ownVideoState) {
            socket.send(JSON.stringify({
                event: 'resume-producer',
                data: {
                    name: nameRef.current,
                    video,
                    audio
                }
            }));
            setOwnVideoState(true);
        }

        if (audio && ownAudioState) {
            socket.send(JSON.stringify({
                event: 'pause-producer',
                data: {
                    name: nameRef.current,
                    video,
                    audio
                }
            }));
            setOwnAudioState(false);
        }
        if (audio && !ownAudioState) {
            socket.send(JSON.stringify({
                event: 'resume-producer',
                data: {
                    name: nameRef.current,
                    video,
                    audio
                }
            }));
            setOwnAudioState(true);
        }
    }

    // MODIF CONSUMING
    function handleRemoteVideoState(producerId, videoState) {
        console.log('clicked');
        if (videoState) {
            socket.send(JSON.stringify({
                event: 'pause-consume',
                data: {
                    name: nameRef.current,
                    producerId: producerId
                }
            }));
            setRemoteStreams((prev) =>
                prev.map((item) =>
                    item.producerId === producerId
                        ? { ...item, videoState: false }
                        : item
                )
            );
        }
        else {
            socket.send(JSON.stringify({
                event: 'resume-consume',
                data: {
                    name: nameRef.current,
                    producerId: producerId
                }
            }));
            setRemoteStreams((prev) =>
                prev.map((item) =>
                    item.producerId === producerId
                        ? { ...item, videoState: true }
                        : item
                )
            );

        }
    }
    function handleRemoteAudioState(producerName, audioState) {

        const producer = AudioRemoteStreams.find(producer => producer.producerName === producerName);
        console.log(producer);

        if (audioState) {
            socket.send(JSON.stringify({
                event: 'pause-consume-audio',
                data: {
                    name: nameRef.current,
                    producerId: producer.producerId
                }
            }));
            setRemoteStreams((prev) =>
                prev.map((item) =>
                    item.producerName === producerName
                        ? { ...item, audioState: false }
                        : item
                )
            );
        }
        else {
            socket.send(JSON.stringify({
                event: 'resume-consume-audio',
                data: {
                    name: nameRef.current,
                    producerId: producer.producerId
                }
            }));
            setRemoteStreams((prev) =>
                prev.map((item) =>
                    item.producerName === producerName
                        ? { ...item, audioState: true }
                        : item
                )
            );
        }
    }



    async function switchTracks() {
        try {
            if (!producer.current) {
                console.error('Producer is not initialized.');
                return;
            }

            if (isScreenShared) {
                console.log('Switching to video');

                // Reinitialize video track if it has ended
                if (!videoTrack.current || videoTrack.current.readyState === 'ended') {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true }).catch((err) => {
                        console.error('Error accessing camera:', err);
                        return null;
                    });
                    if (!stream) return;

                    videoTrack.current = stream.getVideoTracks()[0];

                    // Optional: Update video preview if needed
                    if (videoRef.current) {
                        videoRef.current.srcObject = new MediaStream([videoTrack.current]);
                    }
                }

                await producer.current.replaceTrack({ track: videoTrack.current });
                setIsScreenShare(false);
            } else {
                console.log('Switching to screen');

                // Use existing screen track if live
                if (screenTrack.current && screenTrack.current.readyState === 'live') {
                    await producer.current.replaceTrack({ track: screenTrack.current });
                } else {
                    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                    const screenTrack = stream.getVideoTracks()[0];

                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }

                    // Attach the screen track to your video element or stream
                    producer.current.replaceTrack({ track: screenTrack });

                    // Handle the "stop sharing" event
                    screenTrack.onended = async () => {
                        console.log('Screen sharing stopped by user');

                        // Fallback to the video track
                        if (videoTrack.current && videoTrack.current.readyState === 'live') {
                            // await producer.current.replaceTrack({ track: videoTrack.current });
                            console.log('Switched back to video track');
                        } else {
                            const { vidTrack, audTrack } = await getLocalVideo();
                            await producer.current.replaceTrack({ track: vidTrack });
                            console.error('No active video track to switch back to');
                        }

                        setIsScreenShare(false); // Update your application state
                    };
                }

                setIsScreenShare(true);
            }
        } catch (error) {
            console.error('Error switching tracks:', error);
        }
    }





    // CONTROLS
    async function endCall() {
        setTimeout(() => {
            window.location.reload('/');
        }, 1000);
        router.push('/');
    }
    async function getParticipants() {
        socket.send(JSON.stringify({
            event: 'get-participants',
            data: {
                roomID: roomID
            }
        }))
    }

    return (
        <div className="relative flex flex-col h-screen bg-zinc-950 shadow-sm shadow-white">
            {/* Main Content */}
            <Toaster position="top-center"
                reverseOrder={false} />
            <div className="flex-1 flex flex-col bg-zinc-900">
                {/* Header */}
                <div className="flex items-centerp-4 bg-zinc-900 border-b-[1px] border-zinc-600 py-[15px] gap-x-[10px]">
                    <h1 className="text-lg sm:text-2xl text-white font-bold">
                        Room ID: {roomID}
                    </h1>
                    <Button
                        onClick={handleCopyClick}
                        className={"bg-zinc-100 text-black h-[30px] hover:bg-zinc-300"}
                    >
                        {copied ? "Copied!!" : <Clipboard />}
                    </Button>
                </div>

                {/* Video Grid */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 overflow-y-auto">
                    <div className="relative">
                        <video
                            src=""
                            ref={videoRef}
                            autoPlay
                            muted
                            className={`w-full h-[200px] sm:w-[400px] sm:h-[250px] ${!ownVideoState ? "opacity-[10%]" : "opacity-[100%]"}  object-cover rounded-lg shadow-sm`}
                        />
                        <div className="absolute top-2 left-2 text-xs sm:text-sm text-white bg-black bg-opacity-60 px-2 py-1 sm:px-3 sm:py-1 rounded-lg">
                            You
                        </div>
                    </div>
                    {remoteStreams.map(({ stream, producerId, producerName, videoState, audioState }) => (
                        <div key={producerId} className="relative">
                            <video
                                src=""
                                ref={(el) => {
                                    if (el && !el.srcObject) el.srcObject = stream;
                                }}
                                autoPlay
                                className="w-full h-[200px] sm:w-[400px] sm:h-[250px] object-cover rounded-lg shadow-md"
                            />
                            <div className="absolute top-2 left-2 text-xs sm:text-sm text-white bg-black bg-opacity-60 px-2 py-1 sm:px-3 sm:py-1 rounded-lg">
                                {producerName}
                            </div>
                            <div className="absolute mt-[-45px] ml-[15px] flex space-x-2 z-10">
                                <button
                                    onClick={() => handleRemoteVideoState(producerId, videoState)}
                                    className=" text-white p-2 rounded-full cursor-pointer"
                                >
                                    {videoState ? <Video /> : <VideoOff />}
                                </button>
                                <button
                                    onClick={() => handleRemoteAudioState(producerName, audioState)}
                                    className=" text-white p-2 rounded-full cursor-pointer"
                                >
                                    {audioState ? <Mic /> : <MicOff />}
                                </button>
                                <button
                                    onClick={() => handleEnlargeStream(producerId)}
                                    className=" text-white p-2 rounded-full cursor-pointer"
                                >
                                    <Maximize />
                                </button>
                            </div>
                        </div>
                    ))}
                    {AudioRemoteStreams.map(({ stream, producerId, producerName }) => {
                        return (
                            <div key={producerId} className="relative">
                                <audio
                                    src=""
                                    ref={(el) => {
                                        if (el && !el.srcObject) el.srcObject = stream;
                                    }}
                                    autoPlay
                                    className="w-[1px]"
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Controls */}
                <div className="bg-[#171717] p-4 flex flex-wrap justify-between items-center gap-2 shadow-md">
                    <div className="flex space-x-4">
                        <button
                            onClick={() => handleOwnProduceState(false, true)}
                            className={`bg-[#303030] text-white p-2 rounded-full hover:bg-[#404040]`}
                        >
                            {ownAudioState ? (
                                <Mic className="h-4 w-4" />
                            ) : (
                                <MicOff className="h-4 w-4 text-red-500" />
                            )}
                        </button>
                        <button
                            onClick={() => handleOwnProduceState(true, false)}
                            className={`bg-[#303030] text-white p-2 rounded-full hover:bg-[#404040]`}
                        >
                            {ownVideoState ? (
                                <Video className="h-4 w-4" />
                            ) : (
                                <VideoOff className="h-4 w-4 text-red-500" />
                            )}
                        </button>
                    </div>
                    <div className="flex space-x-4">
                        <button
                            className="bg-[#303030] text-white p-2 rounded-full hover:bg-[#404040]"
                            onClick={() => setShowChat(!showChat)}
                        >
                            <MessageSquare className="h-5 w-5" />
                        </button>
                        <button
                            className="bg-[#303030] text-white p-2 rounded-full hover:bg-[#404040]"
                            onClick={() => {
                                !showParticipants ? getParticipants(roomID) : null;
                                setShowParticipants(!showParticipants);
                            }}
                        >
                            <Users className="h-5 w-5" />
                        </button>
                        <button
                            onClick={switchTracks}
                            className="bg-[#303030] text-white p-2 rounded-full hover:bg-[#404040]"
                        >
                            <MonitorUp className="h-5 w-5" />
                        </button>
                    </div>
                    <button
                        onClick={endCall}
                        className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                    >
                        <Phone className="h-5 w-5" />
                    </button>
                </div>

            </div>

            {/* Enlarged Stream Dialog */}
            {enlargedStream && (
                <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-70">
                    <div className="relative bg-black p-4 rounded-lg">
                        <video
                            ref={(el) => {
                                if (el && !el.srcObject) el.srcObject = remoteStreams.find(stream => stream.producerId === enlargedStream)?.stream;
                            }}
                            autoPlay
                            className="w-[800px] h-auto object-contain rounded-lg"
                        />
                        <button
                            onClick={handleCloseEnlargedStream}
                            className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full"
                        >
                            <X />
                        </button>
                    </div>
                </div>
            )}

            {/* Participants Sidebar */}
            {showParticipants && (
                <div className="absolute top-0 right-0 h-full w-full sm:w-64 bg-zinc-800 border-l border-gray-300 rounded-md shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-zinc-800 text-white p-4 shadow-sm flex items-center justify-between">
                        <h2 className="text-lg font-bold">Participants</h2>
                        <button onClick={() => setShowParticipants(!showParticipants)} className="text-sm px-2 py-1 bg-neutral-700 rounded hover:bg-neutral-800">Close</button>
                    </div>
                    {/* Participants List */}
                    <div className="p-4 overflow-y-auto space-y-4 bg-zinc-800">
                        {participants.length > 0 ? (
                            participants.map((participant) => (
                                <div
                                    key={participant.name}
                                    className="flex items-center space-x-3 p-3 bg-zinc-800 rounded-lg shadow-sm border border-gray-200 hover:shadow-md"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-black font-bold">
                                        {participant.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-white">{participant.name}</p>
                                        <p className="text-xs text-gray-500">{participant.status || "Active"}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 text-center">No participants available.</p>
                        )}
                    </div>
                </div>
            )}


            {/* Chat Sidebar */}
            {showChat && (
                <div className="absolute top-0 right-0 h-full w-full sm:w-[320px] bg-zinc-800 border-l border-gray-300 flex flex-col shadow-lg rounded-md overflow-hidden">
                    {/* Chat Header */}
                    <div className="bg-zinc-800 text-white p-4 shadow-sm flex items-center justify-between">
                        <h2 className="text-lg font-bold">Chat</h2>
                        <button onClick={() => setShowChat(!showChat)} className="text-sm px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-950">Close</button>
                    </div>
                    {/* Chat Messages */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-50">
                        {messages.length > 0 ? (
                            messages.map((data, index) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-lg shadow-sm ${data.from === "Me" ? "bg-blue-100 text-right" : "bg-gray-100 text-left"
                                        }`}
                                >
                                    <p className="text-sm font-semibold text-gray-800">{data.from}</p>
                                    <p className="text-sm text-gray-600 mt-1">{data.message}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 text-center">No messages yet. Start the conversation!</p>
                        )}
                    </div>
                    {/* Message Input */}
                    <div className="p-4 bg-white border-t border-gray-200 flex items-center space-x-3">
                        <input
                            name="message"
                            value={message}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type a message..."
                        />
                        <button
                            className="bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={() => handleMessage(message)}
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}

        </div>
    );

}
