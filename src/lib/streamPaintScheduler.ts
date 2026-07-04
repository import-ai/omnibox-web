function yieldToBrowser() {
  return new Promise<void>(resolve => {
    setTimeout(resolve, 0);
  });
}

export function createPaintScheduler() {
  let bufferedMessages = 0;

  return async (data: string) => {
    bufferedMessages += 1;

    let responseType: string | undefined;
    try {
      responseType = JSON.parse(data).response_type;
    } catch {
      responseType = undefined;
    }

    if (
      ['bos', 'eos', 'done', 'error'].includes(responseType || '') ||
      bufferedMessages >= 16
    ) {
      bufferedMessages = 0;
      await yieldToBrowser();
    }
  };
}
