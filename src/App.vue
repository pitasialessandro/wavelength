<script setup lang="ts">
import { computed, ref, watch, type Ref } from "vue";
import cards from "./cards.json";

type Card = [string, string];

function stored<T>(key: string, fallback: T): Ref<T> {
  const r = ref(fallback) as Ref<T>;
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    if (v !== null) r.value = Array.isArray(v) || typeof v !== "object" ? v : { ...fallback, ...v };
  } catch {}
  watch(r, (v) => localStorage.setItem(key, JSON.stringify(v)), { deep: true });
  return r;
}

const custom = stored<Card[]>("wavelength:custom", []);
const llm = stored<Card[]>("wavelength:llm", []);
const pools = stored("wavelength:pools", { og: true, custom: true, llm: true });
const crazy = stored("wavelength:crazy", 50);

const pool = computed<Card[]>(() => [
  ...(pools.value.og ? (cards as Card[]) : []),
  ...(pools.value.custom ? custom.value : []),
  ...(pools.value.llm ? llm.value : []),
]);

// ponytail: mazzo mescolato e consumato in ordine, niente ripetizioni fino a fine giro
const deck: Card[] = [];
const card = ref<Card | null>(null);
watch(pool, () => (deck.length = 0));

function draw() {
  if (!pool.value.length) return;
  if (!deck.length) deck.push(...[...pool.value].sort(() => Math.random() - 0.5));
  card.value = deck.pop()!;
}

const left = ref("");
const right = ref("");

function add() {
  const l = left.value.trim();
  const r = right.value.trim();
  if (!l || !r) return;
  custom.value.push([l, r]);
  left.value = right.value = "";
}

function remove(list: Card[], i: number) {
  list.splice(i, 1);
}

const busy = ref(false);
const error = ref("");
const keyOf = (p: Card) => p.map((s) => s.trim().toLowerCase()).sort().join("|");

async function generate() {
  busy.value = true;
  error.value = "";
  try {
    const examples = [...pool.value].sort(() => Math.random() - 0.5).slice(0, 5);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ crazyness: crazy.value / 100, count: 20, examples }),
    });
    if (!res.ok) throw new Error(await res.text());
    const { pairs } = (await res.json()) as { pairs: Card[] };
    const known = new Set([...(cards as Card[]), ...custom.value, ...llm.value].map(keyOf));
    llm.value.push(...pairs.filter((p) => !known.has(keyOf(p))));
  } catch {
    error.value = "Generazione fallita, riprova.";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="min-h-dvh flex flex-col items-center justify-center gap-10 p-6 bg-neutral-100 text-neutral-900">
    <button
      class="w-full max-w-sm aspect-3/2 rounded-2xl bg-white shadow-lg grid grid-cols-[1fr_1px_1fr] items-center px-4 text-lg font-medium select-none active:scale-[0.98] transition"
      @click="draw"
    >
      <span class="flex flex-col items-center gap-3 text-center">
        <svg viewBox="0 0 64 8" class="w-16 h-2 fill-none stroke-current stroke-[1.5] -scale-x-100" aria-hidden="true"><path d="M0 4h62M58 1l4 3-4 3" /></svg>{{ card?.[0] ?? "" }}
      </span>
      <span class="h-1/2 bg-neutral-300" />
      <span class="flex flex-col items-center gap-3 text-center">
        <svg viewBox="0 0 64 8" class="w-16 h-2 fill-none stroke-current stroke-[1.5]" aria-hidden="true"><path d="M0 4h62M58 1l4 3-4 3" /></svg>{{ card?.[1] ?? "" }}
      </span>
    </button>
    <button
      class="px-8 py-4 rounded-full bg-neutral-900 text-white text-lg font-semibold active:scale-95 transition disabled:opacity-30"
      :disabled="!pool.length"
      @click="draw"
    >
      {{ card ? "Prossima carta" : "Pesca" }}
    </button>

    <fieldset class="flex flex-wrap justify-center gap-2 text-sm">
      <label class="rounded-full border border-neutral-300 px-4 py-1.5 cursor-pointer select-none has-checked:bg-neutral-900 has-checked:text-white has-checked:border-neutral-900">
        <input v-model="pools.og" type="checkbox" class="sr-only" /> Originali ({{ cards.length }})
      </label>
      <label class="rounded-full border border-neutral-300 px-4 py-1.5 cursor-pointer select-none has-checked:bg-neutral-900 has-checked:text-white has-checked:border-neutral-900">
        <input v-model="pools.custom" type="checkbox" class="sr-only" /> Le mie ({{ custom.length }})
      </label>
      <label class="rounded-full border border-neutral-300 px-4 py-1.5 cursor-pointer select-none has-checked:bg-neutral-900 has-checked:text-white has-checked:border-neutral-900">
        <input v-model="pools.llm" type="checkbox" class="sr-only" /> AI ({{ llm.length }})
      </label>
    </fieldset>

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
          <button class="text-neutral-400 px-2" aria-label="Elimina" @click="remove(custom, i)">×</button>
        </li>
      </ul>
    </details>

    <details class="w-full max-w-sm text-sm">
      <summary class="cursor-pointer text-neutral-500 text-center">Genera con AI ({{ llm.length }})</summary>
      <label class="mt-4 flex items-center gap-3">
        Fantasia
        <input v-model.number="crazy" type="range" min="0" max="100" class="flex-1 accent-neutral-900" />
        <span class="w-8 text-right tabular-nums">{{ crazy }}</span>
      </label>
      <div class="mt-3 flex gap-2">
        <button
          class="flex-1 rounded-lg bg-neutral-900 text-white px-4 py-2 font-semibold disabled:opacity-30"
          :disabled="busy"
          @click="generate"
        >
          {{ busy ? "Genero…" : "Genera 20 carte" }}
        </button>
        <button v-if="llm.length" class="rounded-lg border border-neutral-300 px-4 py-2" @click="llm = []">Svuota</button>
      </div>
      <p v-if="error" class="mt-2 text-red-600">{{ error }}</p>
      <ul class="mt-3 divide-y divide-neutral-200">
        <li v-for="([l, r], i) in llm" :key="i" class="flex items-center gap-2 py-2">
          <span class="flex-1">{{ l }} <span class="text-neutral-400">↔</span> {{ r }}</span>
          <button class="text-neutral-400 px-2" aria-label="Elimina" @click="remove(llm, i)">×</button>
        </li>
      </ul>
    </details>
  </main>
</template>
