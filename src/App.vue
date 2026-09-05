<script setup lang="ts">
import { ref, watch } from 'vue'
import cards from './cards.json'

type Card = [string, string]

const KEY = 'wavelength:custom'
const custom = ref<Card[]>([])
try {
  custom.value = JSON.parse(localStorage.getItem(KEY) ?? '[]')
} catch {}
watch(custom, (v) => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })

// ponytail: mazzo mescolato e consumato in ordine, niente ripetizioni fino a fine giro
const deck: Card[] = []
const card = ref<Card | null>(null)

function draw() {
  if (!deck.length) deck.push(...([...cards, ...custom.value] as Card[]).sort(() => Math.random() - 0.5))
  card.value = deck.pop()!
}

const left = ref('')
const right = ref('')

function add() {
  const l = left.value.trim()
  const r = right.value.trim()
  if (!l || !r) return
  custom.value.push([l, r])
  left.value = right.value = ''
  deck.length = 0
}

function remove(i: number) {
  custom.value.splice(i, 1)
  deck.length = 0
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

    <details class="w-full max-w-sm text-sm">
      <summary class="cursor-pointer text-neutral-500 text-center">Le mie carte ({{ custom.length }})</summary>
      <form class="mt-4 flex gap-2" @submit.prevent="add">
        <input v-model="left" placeholder="Sinistra" required class="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2" />
        <input v-model="right" placeholder="Destra" required class="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2" />
        <button class="rounded-lg bg-neutral-900 text-white px-4 font-semibold">+</button>
      </form>
      <ul class="mt-3 divide-y divide-neutral-200">
        <li v-for="([l, r], i) in custom" :key="i" class="flex items-center gap-2 py-2">
          <span class="flex-1">{{ l }} <span class="text-neutral-400">↔</span> {{ r }}</span>
          <button class="text-neutral-400 px-2" aria-label="Elimina" @click="remove(i)">×</button>
        </li>
      </ul>
    </details>
  </main>
</template>
