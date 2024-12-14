'use client';
import useWebSocket from "@/store/useWebSocket";
import React, { useEffect, useRef, useState } from "react";
import mediasoup, { Device } from 'mediasoup-client';
import axios from "axios";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

const api = axios.create({
  baseURL: serverUrl
});

export default function Home() {

  const initSocketConnection = useWebSocket(state => state.initSocketConnection);
  const socket = useWebSocket(state => state.socket);

  const videoRef = useRef(null);
  const remoteRef = useRef(null);
  const videoTrack = useRef(null);
  const audioTrack = useRef(null);
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

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

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

  function handleSetName() {
    nameRef.current = name;
    socket.send(JSON.stringify({
      event: "name",
      data: {
        name: name
      }
    }));
  }
  function handleMessage(message) {

    if (dataProducer.current.readyState !== 'open') return;
    dataProducer.current.send(JSON.stringify({
      from: nameRef.current,
      message: message
    }));
    setMessages((messages) => [...messages, { from: nameRef.current, message: message }]);
  }

  useEffect(() => {
    (async function inits() {
      await initSocketConnection();
    })();
  }, []);

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
          console.log(params);

          producerTransport.current = deviceRef.current.createSendTransport(params);

          console.log('PRODUCER TRANSPORT CREATED', producerTransport.current);

          producerTransport.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
            console.log(dtlsParameters);

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

              console.log(parameters);

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

            console.log(dtlsParameters);
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
    await createDataTransport(true, false);
    await connectDataProduceTranport();

  }
  async function consume() {
    setAudioRemoteStreams([]);
    setRemoteStreams([]);
    await getRtpCapabilities();
    await createTransport(false, true);
    await connectRecvTransport();
    await createAudioTransport(false, true);
    await connectAudioRecvTransport();
    await createDataTransport(false, true);
    await connectDataConsumeTransport();
  }

  async function produceData() {
    await getRtpCapabilities();
    await createDataTransport(true, false);
    await connectDataProduceTranport();
  }

  async function consumeData() {

    if (!deviceRef.current) {
      await getRtpCapabilities();
    }
    await createDataTransport(false, true);
    await connectDataConsumeTransport();

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
        console.log("Device Created", deviceRef.current);

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
      recv
    });
    if (req.status === 200) {
      const { event, data } = req.data;
      // console.log(data);
      //CREATE PRODUCER-TRANSPORT
      if (event === 'createProducerTransport') {
        const params = data
        producerTransport.current = deviceRef.current.createSendTransport(params);

        console.log('PRODUCER TRANSPORT CREATED', producerTransport.current);

        producerTransport.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
          console.log(dtlsParameters);

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

            console.log(parameters);

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
        console.log('Consumer Params : ', params);

        consumerTransport.current = deviceRef.current.createRecvTransport(params);

        consumerTransport.current.on('connect', async ({ dtlsParameters }, callback, errback) => {

          console.log(dtlsParameters);
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

      console.log(producer.current);

    } catch (error) { console.log(error); }
  }
  async function connectRecvTransport() {
    try {
      console.log('CALLED');
      const res = await api.post('/transport-consume', {
        rtpCapabilities: deviceRef.current.rtpCapabilities,
        name: nameRef.current
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
              producerId: params.producerId
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
      recv
    });
    if (req.status === 200) {
      const { event, data } = req.data;
      // console.log(data);
      //CREATE PRODUCER-TRANSPORT
      if (event === 'createProducerTransport') {
        const params = data
        audioProducerTransport.current = deviceRef.current.createSendTransport(params);

        console.log(' AUDIO PRODUCER TRANSPORT CREATED', audioProducerTransport.current);

        audioProducerTransport.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
          console.log(dtlsParameters);

          try {

            await socket.send(JSON.stringify({
              event: 'producer-connect-audio',
              data: {
                dtlsParameters
              }
            }));

            callback();
          } catch (error) {
            errback(error);
          }

        })

        audioProducerTransport.current.on('produce', async (parameters, callback, errback) => {

          try {

            console.log(parameters);

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
        console.log('Audio Consumer Params : ', params);

        audioConsumerTransport.current = deviceRef.current.createRecvTransport(params);

        audioConsumerTransport.current.on('connect', async ({ dtlsParameters }, callback, errback) => {

          console.log(dtlsParameters);
          try {
            await socket.send(JSON.stringify({
              event: 'consumer-connect-audio',
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

      console.log("Audio Produced", audioProducer.current);

    } catch (error) { console.log(error); }
  }
  async function connectAudioRecvTransport() {
    setAudioRemoteStreams([]);
    try {
      const res = await api.post('/transport-consume-audio', {
        rtpCapabilities: deviceRef.current.rtpCapabilities,
        name: nameRef.current
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
          console.log(track);
          // Update state with the new stream
          setAudioRemoteStreams((prevStreams) => [
            ...prevStreams,
            {
              stream: remoteStream,
              producerName: params[i].producerName,
              producerId: params[i].producerId
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

          console.log(AudioRemoteStreams)


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

    } catch (error) {
      console.log(error);
    }
  }

  async function connectDataConsumeTransport() {
    try {

      const res = await api.post('/data-consume', {
        name: nameRef.current
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


    } catch (error) {
      console.log(error);
    }
  }

  // MODIF PRODUCING
  async function pauseProducer() {
    await socket.send(JSON.stringify({
      event: 'pause-producer',
      data: {
        name: nameRef.current
      }
    }));
  }
  async function resumeProducer() {
    await socket.send(JSON.stringify({
      event: 'resume-producer',
      data: {
        name: nameRef.current
      }
    }));
  }


  // MODIF CONSUMING
  async function resumeConsume(producerId, video) {
    await socket.send(JSON.stringify({
      event: 'resume-consume',
      data: {
        name: nameRef.current,
        producerId: producerId
      }
    }));
  }
  async function resumeAudio(producerId) {
    await socket.send(JSON.stringify({
      event: 'resume-consume-audio',
      data: {
        name: nameRef.current,
        producerId: producerId
      }
    }));
  }
  async function pauseConsume(producerId) {
    await socket.send(JSON.stringify({
      event: 'pause-consume',
      data: {
        name: nameRef.current,
        producerId: producerId
      }
    }));
  }
  async function pauseAudio(producerId) {
    await socket.send(JSON.stringify({
      event: 'pause-consume-audio',
      data: {
        name: nameRef.current,
        producerId: producerId
      }
    }));
  }

  // CONTROLS
  async function endCall(params) {
    
  }
 

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-white shadow-md border-b border-gray-300">
        <h1 className="text-xl font-semibold text-gray-800">Meeting Room</h1>
        <div className="flex gap-4">
          <input
            name="name"
            value={name}
            className="border rounded px-3 py-1 text-sm"
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md" onClick={handleSetName}>Set Name</button>
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-md" onClick={endCall}>End Call</button>
        </div>
      </header>
  
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Grid */}
        <div className="flex flex-wrap flex-1 gap-6 p-6 overflow-auto">
          {/* Local Stream */}
          <div className="relative w-[320px] h-[240px] bg-gray-200 rounded-lg border shadow-md">
            <video
              src=""
              ref={videoRef}
              autoPlay
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute top-2 left-2 text-sm text-white bg-black bg-opacity-50 px-3 py-1 rounded-lg">
              You
            </div>
          </div>
  
          {/* Remote Video Streams */}
          {remoteStreams.map((streamData, index) => (
            <div key={index} className="relative w-[320px] h-[240px] bg-gray-200 rounded-lg border shadow-md">
              <video
                ref={(el) => {
                  if (el && !el.srcObject) {
                    el.srcObject = streamData.stream;
                  }
                }}
                autoPlay
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute top-2 left-2 text-sm text-white bg-black bg-opacity-50 px-3 py-1 rounded-lg">
                {streamData.producerName}
              </div>
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  className="bg-green-500 text-white px-2 py-1 text-xs rounded"
                  onClick={() => resumeConsume(streamData.producerId, true)}
                >
                  Resume
                </button>
                <button
                  className="bg-yellow-500 text-white px-2 py-1 text-xs rounded"
                  onClick={() => pauseConsume(streamData.producerId, true)}
                >
                  Pause
                </button>
              </div>
            </div>
          ))}
        </div>
  
        {/* Side Panel */}
        <div className="w-[320px] bg-white border-l border-gray-300 flex flex-col shadow-lg">
          {/* Chat Section */}
          <div className="flex flex-col p-6 h-full overflow-auto">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Chat</h2>
            <div className="flex flex-col gap-3 mb-6">
              {messages.map((data, index) => (
                <div key={index} className="p-3 rounded-lg bg-gray-100 shadow-sm">
                  <p className="text-sm font-semibold text-gray-800">{data.from}</p>
                  <p className="text-sm text-gray-600">{data.message}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-auto">
              <input
                name="message"
                value={message}
                className="flex-1 border rounded px-3 py-2 text-sm"
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message"
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                onClick={() => handleMessage(message)}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
  
      {/* Footer Controls */}
      <footer className="flex justify-center gap-6 p-6 bg-white border-t border-gray-300 shadow-md">
        <button
          className="bg-green-600 text-white px-5 py-3 rounded-lg"
          onClick={produce}
        >
          Start Video
        </button>
        <button
          className="bg-green-600 text-white px-5 py-3 rounded-lg"
          onClick={consume}
        >
          Consume Video
        </button>
        <button
          className="bg-blue-600 text-white px-5 py-3 rounded-lg"
          onClick={produceData}
        >
          Start Data Stream
        </button>
        <button
          className="bg-yellow-600 text-white px-5 py-3 rounded-lg"
          onClick={pauseProducer}
        >
          Pause Video
        </button>
        <button
          className="bg-red-600 text-white px-5 py-3 rounded-lg"
          onClick={resumeProducer}
        >
          Resume Video
        </button>
      </footer>
    </div>
  );
    
}

