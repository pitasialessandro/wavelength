<script setup lang="ts">
import { ref } from 'vue'
import cards from './cards.json'

type Card = [string, string]

// ponytail: mazzo mescolato e consumato in ordine, niente ripetizioni fino a fine giro
const deck: Card[] = []
const card = ref<Card | null>(null)

function draw() {
  if (!deck.length) deck.push(...([...cards] as Card[]).sort(() => Math.random() - 0.5))
  card.value = deck.pop()!
}
</script>

<template>
  <main class="min-h-dvh flex flex-col items-center justify-center gap-10 p-6 bg-neutral-100 text-neutral-900">
    <button
      class="w-full max-w-sm aspect-[3/2] rounded-2xl bg-white shadow-lg grid grid-cols-[1fr_1px_1fr] items-center px-4 text-lg font-medium select-none active:scale-[0.98] transition"
      @click="draw"
    >
      <span class="flex flex-col items-center gap-3 text-center">
        <span aria-hidden="true">←</span>{{ card?.[0] ?? '' }}
      </span>
      <span class="h-1/2 bg-neutral-300" />
      <span class="flex flex-col items-center gap-3 text-center">
        <span aria-hidden="true">→</span>{{ card?.[1] ?? '' }}
      </span>
    </button>
    <button class="px-8 py-4 rounded-full bg-neutral-900 text-white text-lg font-semibold active:scale-95 transition" @click="draw">
      {{ card ? 'Prossima carta' : 'Pesca' }}
    </button>
  </main>
</template>
