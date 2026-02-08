<template>
  <a
    href="https://buymeacoffee.com/kentphung92"
    target="_blank"
    class="bmc-button"
  >
    <span class="bmc-icon">🥖</span>
    <span class="bmc-text">Buy me a banh mi</span>
  </a>
</template>

<style scoped>
.bmc-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #FFB700 0%, #FFA500 100%);
  color: #000000;
  font-family: 'Comic Sans MS', 'Comic Sans', cursive;
  font-size: 16px;
  font-weight: bold;
  text-decoration: none;
  border-radius: 12px;
  border: 2px solid #000000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
  cursor: pointer;
}

.bmc-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  background: linear-gradient(135deg, #FFC700 0%, #FFB000 100%);
}

.bmc-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.bmc-icon {
  font-size: 24px;
  line-height: 1;
}

.bmc-text {
  line-height: 1;
  white-space: nowrap;
}
</style>
