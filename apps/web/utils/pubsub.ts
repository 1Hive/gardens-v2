import { ServerResponse } from 'http';

type Subscriber = {
  res: ServerResponse,
  topic: string
};

const subscribers: { [key: string]: ServerResponse[] } = {};

export type ChangeTopic = "community" | "garden" | "token" | "user";
export type ChangeContext = {
  type: 'add' | 'delete' | 'update',
  id?: string,
  context: any,
  topic: ChangeTopic,
}

export const subscribe = (topics: ChangeTopic[], res: ServerResponse) => {
  topics.forEach(topic => {
    if (!subscribers[topic]) {
      subscribers[topic] = [];
    }
    subscribers[topic].push(res);
  });

  res.on('close', () => {
    // subscribers[topic] = subscribers[topic].filter(sub => sub !== res);
  });
};

export const publish = (context: ChangeContext) => {
  if (!subscribers[context.topic]) return;

  subscribers[context.topic].forEach(res => {
    setTimeout(() => {
      res.write(JSON.stringify(context));
    }, 2000);
  });
}