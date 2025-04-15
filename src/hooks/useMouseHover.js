import { ref } from 'vue';

export function useMouseHover(delay = 1000) {
  const showHoverState = ref(false);
  let timer = null;

  const onEnter = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      showHoverState.value = true;
    }, delay);
  };

  const onLeave = () => {
    clearTimeout(timer);
    showHoverState.value = false;
  };

  return {
    showHoverState,
    onEnter,
    onLeave
  };
}