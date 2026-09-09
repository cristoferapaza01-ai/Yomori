import { getAvailableExtensions, findExtensionForUrl } from './index.js';

console.log('--- TEST: Listando extensiones registradas ---');
const extensions = getAvailableExtensions();
console.log('Extensiones encontradas:', extensions);

console.log('\n--- TEST: Comprobando canHandle para URLs ---');
const testUrls = [
  'https://olympusv2.gg/capitulo/98765/comic-solo-leveling',
  'https://olympusscans.com/capitulo/123/comic-nano-machine',
  'https://zonatmo.com/viewer/abcdef/cascade',
  'https://sitiodesconocido.com/manga/1'
];

for (const url of testUrls) {
  const handler = findExtensionForUrl(url);
  console.log(`URL: ${url}`);
  console.log(`  -> Manejado por: ${handler ? handler.name + ' (' + handler.id + ')' : 'NINGUNO (No soportado)'}`);
}

console.log('\n--- Test de registro completado con éxito ---');
