// Cotejar el trabajo propio con lo que subió el compañero, antes de empezar y antes de unir a dev.
//
//   npm run cotejar
//
// 1. Trae lo nuevo de GitHub (git fetch).
// 2. Lista los commits de origin/dev y origin/main que aún no están en las ramas locales, con autor y archivos.
// 3. Compara la rama actual (commits + cambios sin guardar) con lo que entró a origin/dev desde que se separó:
//    archivos que tocaron ambos, migraciones nuevas de los dos lados y copias que deben cambiar juntas.
//
// Solo lee: no une, no cambia de rama ni sube nada.

import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('../../', import.meta.url))

/** Archivos que son copia uno del otro: si cambia uno, cambia el otro */
const PARES = [
  ['server/src/utils/money.js', 'client/src/lib/money.js'],
  ['server/src/modules/roles/permisos.catalogo.js', 'client/src/lib/permisos.js'],
]

function git(...args) {
  return execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' }).trim()
}
const lineas = (texto) => (texto ? texto.split('\n').filter(Boolean) : [])
const existe = (ref) => {
  try {
    git('rev-parse', '--verify', '--quiet', ref)
    return true
  } catch {
    return false
  }
}
const titulo = (texto) => console.log(`\n== ${texto} ==`)
const aviso = (texto) => console.log(`  ⚠ ${texto}`)

console.log('• Trayendo cambios de GitHub…')
git('fetch', 'origin', '--prune', '--quiet')

const yo = git('config', 'user.name')
const rama = git('rev-parse', '--abbrev-ref', 'HEAD')

// 1. Lo que hay en GitHub y no en las ramas locales
for (const r of ['dev', 'main']) {
  titulo(`origin/${r}: commits que su rama local ${r} todavía no tiene`)
  if (!existe(r)) {
    console.log(`  (no existe la rama local ${r}; créela con: git checkout ${r})`)
    continue
  }
  const commits = lineas(
    git('log', '--no-merges', '--format=%h|%an|%ad|%s', '--date=short', `${r}..origin/${r}`),
  )
  if (!commits.length) console.log('  Nada nuevo.')
  for (const c of commits) {
    const [hash, autor, fecha, asunto] = c.split('|')
    const marca = autor === yo ? '' : '  ← compañero'
    console.log(`  ${hash} ${fecha} ${autor}: ${asunto}${marca}`)
    for (const f of lineas(git('show', '--name-status', '--format=', hash)))
      console.log(`      ${f}`)
  }
}

// 2. Rama actual frente a origin/dev
titulo(`Rama actual (${rama}) frente a origin/dev`)
const base = git('merge-base', 'HEAD', 'origin/dev')
const mios = new Set([
  ...lineas(git('diff', '--name-only', base, 'HEAD')),
  ...lineas(git('diff', '--name-only', 'HEAD')),
  ...lineas(git('ls-files', '--others', '--exclude-standard')),
])
const suyos = new Set(lineas(git('diff', '--name-only', base, 'origin/dev')))
const atrasados = lineas(git('rev-list', `HEAD..origin/dev`)).length

console.log(
  `  Archivos cambiados aquí: ${mios.size} · entraron a origin/dev desde que se separó: ${suyos.size} (${atrasados} commits)`,
)

const ambos = [...mios].filter((f) => suyos.has(f))
if (ambos.length) {
  aviso('Archivos que tocaron los dos (revise que no se pisen los cambios):')
  for (const f of ambos) {
    const quien = lineas(git('log', '--format=%an', `${base}..origin/dev`, '--', f))
    console.log(`      ${f}  (en dev: ${[...new Set(quien)].join(', ')})`)
  }
}

const migraciones = (set) => [...set].filter((f) => f.startsWith('server/migrations/')).sort()
const misMig = migraciones(mios).filter((f) => !suyos.has(f))
const susMig = migraciones(suyos)
if (misMig.length && susMig.length) {
  aviso(
    'Hay migraciones nuevas de los dos lados. Las suyas deben quedar con fecha posterior a las de dev:',
  )
  for (const f of susMig) console.log(`      dev:  ${f}`)
  for (const f of misMig) console.log(`      aquí: ${f}`)
  const ultimaDev = susMig.at(-1).split('/').pop()
  const viejas = misMig.filter((f) => f.split('/').pop() < ultimaDev)
  for (const f of viejas)
    aviso(`${f} es anterior a ${ultimaDev}: renómbrela antes de unir (aún no está publicada).`)
}

for (const [a, b] of PARES) {
  for (const [lado, set] of [
    ['aquí', mios],
    ['en dev', suyos],
  ]) {
    if (set.has(a) !== set.has(b))
      aviso(`${lado} cambió ${set.has(a) ? a : b} pero no su copia ${set.has(a) ? b : a}.`)
  }
}

titulo('Qué hacer')
if (rama === 'main') console.log('  No trabaje en main: git checkout dev && git pull')
else if (atrasados)
  console.log(
    `  Traiga lo del compañero a su rama: git merge origin/dev  (y luego npm install, npm run db:migrate, npm test)`,
  )
else console.log('  Su rama está al día con origin/dev.')
if (ambos.length)
  console.log(
    '  Lea los commits del compañero en esos archivos: git log -p ' +
      `${base}..origin/dev -- <archivo>`,
  )
console.log('')
