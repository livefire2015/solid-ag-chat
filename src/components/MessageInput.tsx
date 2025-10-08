import { Component, createSignal } from 'solid-js';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
}

const MessageInput: Component<MessageInputProps> = (props) => {
  const [message, setMessage] = createSignal('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const trimmedMessage = message().trim();
    if (trimmedMessage && !props.disabled) {
      props.onSendMessage(trimmedMessage);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div class="border-t bg-white p-4">
      <form onSubmit={handleSubmit} class="flex space-x-2">
        <textarea
          value={message()}
          onInput={(e) => setMessage(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
          class="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="2"
          disabled={props.disabled}
        />
        <button
          type="submit"
          disabled={props.disabled || !message().trim()}
          class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {props.disabled ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
