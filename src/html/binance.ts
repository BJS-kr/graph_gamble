export class BinanceWebSocketError extends Error {
  public code: number;
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export class BinanceWebSocket extends WebSocket {
  private readonly id: number;
  private subscribedChannels = 0;
  private attemptedSubscribeChannels = 0;
  private attemptedUnsubscribeChannels = 0;
  private waitingForUnsubscribeResponse = false;
  public connected = false;

  constructor(symbols, callback, id) {
    super('wss://stream.binance.com:9443/ws/streams/');
    this.id = id;

    this.onopen = () => {
      this.subscribe(symbols);
    };

    this.onmessage = ({ data }) => {
      data = JSON.parse(data);
      // error response
      if (data.msg) {
        throw new BinanceWebSocketError(data.msg, data.code);
        // subscribe, unsubscribe, listing response
      } else if (data.id) {
        // subscribe or unsubscribe response
        if (data.result === null) {
          // unsubscribe response
          if (this.waitingForUnsubscribeResponse) {
            this.subscribedChannels -= this.attemptedUnsubscribeChannels;
            this.attemptedUnsubscribeChannels = 0;
            this.waitingForUnsubscribeResponse = false;
            !this.subscribedChannels && (this.connected = false);
            // subscribe response
          } else {
            this.subscribedChannels += this.attemptedSubscribeChannels;
            this.attemptedSubscribeChannels = 0;
            this.subscribedChannels && (this.connected = true);
          }
          // listing response
        } else {
          // 리스팅 응답에 대한 처리
        }
        // stream response
      } else {
        callback(data);
      }
    };
  }

  subscribe(symbols) {
    this.attemptedSubscribeChannels = symbols.length;
    this.send(
      JSON.stringify({
        method: 'SUBSCRIBE',
        params: symbols,
        id: this.id,
      }),
    );
  }

  unsubscribe(symbols) {
    this.attemptedUnsubscribeChannels = symbols.length;
    this.waitingForUnsubscribeResponse = true;
    this.send(
      JSON.stringify({
        method: 'UNSUBSCRIBE',
        params: symbols,
        id: this.id,
      }),
    );
  }

  list() {
    this.send(
      JSON.stringify({
        method: 'LIST_SUBSCRIPTIONS',
        id: this.id,
      }),
    );
  }
}
