<template>
  <svg 
    :width="size || 18" 
    :height="size || 18" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    stroke-width="1.8" 
    stroke-linecap="round" 
    stroke-linejoin="round"
    class="icon-dice inline-block align-middle shrink-0"
  >
    <!-- Outer d20 hexagon -->
    <path d="M12 2L21 7.2V16.8L12 22L3 16.8V7.2L12 2Z" />
    <!-- Inner inverted triangle -->
    <polygon points="12 6.5 18.5 15.5 5.5 15.5" />
    <!-- Connecting lines from inner triangle vertices to hexagon vertices -->
    <line x1="12" y1="2" x2="12" y2="6.5" />
    <line x1="21" y1="7.2" x2="18.5" y2="15.5" />
    <line x1="3" y1="7.2" x2="5.5" y2="15.5" />
    <line x1="21" y1="16.8" x2="18.5" y2="15.5" />
    <line x1="3" y1="16.8" x2="5.5" y2="15.5" />
    <line x1="12" y1="22" x2="18.5" y2="15.5" />
    <line x1="12" y1="22" x2="5.5" y2="15.5" />
    <line x1="12" y1="6.5" x2="21" y2="7.2" />
    <line x1="12" y1="6.5" x2="3" y2="7.2" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  size?: number | string;
}>();
</script>

<style scoped>
.icon-dice {
  display: inline-block;
  vertical-align: middle;
  transition: transform 0.15s ease;
}
button:hover .icon-dice {
  transform: rotate(15deg) scale(1.08);
}
</style>
