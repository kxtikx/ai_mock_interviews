'use client'

import { cn } from '@/lib/utils';
import Image from 'next/image'
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { vapi } from '@/lib/vapi.sdk';
import { interviewer } from '@/constants';
import { createFeedback } from '@/lib/actions/general.actions';


enum CallStatus {
    INACTIVE = 'INACTIVE',
    CONNECTING = 'CONNECTING',
    ACTIVE = 'ACTIVE',
    FINISHED = 'FINISHED',
}

interface SavedMessage {
    role: 'user' | 'system' | 'assistant';
    content: string;
}

const Agent = ({ userName, userId, type, interviewId, questions }: AgentProps) => {
    const router = useRouter();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [messages, setMessages] = useState<SavedMessage[]>([]);

    useEffect(() => {
        const onCallStart = () => setCallStatus(CallStatus.ACTIVE);
        const onCallEnd = () => setCallStatus(CallStatus.FINISHED);

        const onMessage = (message: Message) => {
            if (message.type === 'transcript' && message.transcriptType === 'final') {
                const newMessage = { role: message.role, content: message.transcript }

                setMessages((prev) => [...prev, newMessage]);
            }
        }

        const onSpeechStart = () => setIsSpeaking(true);
        const onSpeechEnd = () => setIsSpeaking(false);

        const onError = (error: Error) => console.log('Error', error);

        vapi.on('call-start', onCallStart);
        vapi.on('call-end', onCallEnd);
        vapi.on('message', onMessage);
        vapi.on('speech-start', onSpeechStart);
        vapi.on('speech-end', onSpeechEnd);
        vapi.on('error', onError);

        return () => {
            vapi.off('call-start', onCallStart);
            vapi.off('call-end', onCallEnd);
            vapi.off('message', onMessage);
            vapi.off('speech-start', onSpeechStart);
            vapi.off('speech-end', onSpeechEnd);
            vapi.off('error', onError);
        }


    }, [])

    const handleGenerateFeedback = async ( messages: SavedMessage[]) =>{
        console.log('Generate Feedback here.');
//TODO
        const { success, feedbackId: id} = await createFeedback({
            interviewId: interviewId!,
            userId: userId!,
            transcript: messages
        })

        if(success && id){
            router.push(`/interview/${interviewId}/feedback`);
        } else {
            console.log('Error saving feedback');
            router.push('/');
        }
    }

    useEffect(() => {
        if (callStatus === CallStatus.FINISHED){
            if(type === 'generate'){
                router.push('/')
            } else {
                handleGenerateFeedback(messages);
            }
        }
        

    }, [messages, callStatus, type, userId]);

    useEffect(() => {
        console.log('CURRENT USER ID:', userId);      // ←  you will see this in DevTools
    }, [userId]);

    const handleCall = async () => {
        setCallStatus(CallStatus.CONNECTING);

        if(type === 'generate'){
            await vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!, {
                variableValues: {
                    username: userName,
                    userid: userId,
                }
            })

        } else {
            let formattedQuestions = '';

            if(questions){
                formattedQuestions = questions
                .map((question) => `-${questions}`)
                .join('\n');
            }

            await vapi.start(interviewer, {
                variableValues:{
                    questions : formattedQuestions
                }
            })
        }


    }

    const handleDisconnect = async () => {
        setCallStatus(CallStatus.FINISHED);

        vapi.stop();
    }

    const lastestMessage = messages[messages.length - 1]?.content;
    const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

    return (
        <>
            <div className='call-view'>
                <div className='card-interviewer'>
                    <div className='avatar'>
                        <Image src="/ai-avatar.png" alt='vapi' width={65} height={54} className='object-cover' />
                        {isSpeaking && <span className='animate-speak' />}
                    </div>
                    <h3>AI Interviewer</h3>
                </div>

                <div className='card-border'>
                    <div className="card-content">
                        <Image src="/user-avatar.png" alt='user avatar' width={540} height={540} className='rounded-full object-cover size-[120px]' />
                        <h3>{userName}</h3>
                    </div>
                </div>
            </div>

            {messages.length > 0 && (
                <div className="transcript-border">
                    <div className="transcript">
                        <p key={lastestMessage} className={cn('transition-opacity duration-500 opacity-0', 'animate-fadeIn opacity-100')}>{lastestMessage}</p>
                    </div>
                </div>
            )}

            <div className='w-full flex justify-center'>
                {callStatus != 'ACTIVE' ? (
                    <button className='relative btn-call' onClick={handleCall}>
                        <span className={cn('absolute animate-ping rounded-full opacity-75', callStatus != 'CONNECTING' && 'hidden')} />
                        <span>
                            {isCallInactiveOrFinished ? 'Call' : '...'}

                        </span>

                    </button>
                ) : (
                    <button className='btn-disconnect' onClick={handleDisconnect}>
                        End
                    </button>
                )}
            </div>
        </>
    )
}

export default Agent
