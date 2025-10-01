'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';

const RESOURCES = {"assets/AssetManifest.bin": "c332d524560f5dd23b3edbbbb528eaf4",
"assets/AssetManifest.bin.json": "4cba94bb5148ff57d0bebff8ec2516c3",
"assets/AssetManifest.json": "92d7a7bc15540c197e145bc3a2ac9dc5",
"assets/assets/a.png": "9f1f600af211b1441906aee1fec1a25d",
"assets/assets/bg_image.jpg": "cb72e9e3e77bc661eaae70a16a478113",
"assets/assets/default_avatar.png": "26901c5448efa3f36e8c4c23505ff2bb",
"assets/assets/images/badges/beginner.png": "ef0758c2ea271ae151a8e81562e7de1a",
"assets/assets/images/badges/brasseur.png": "99cc161471de56a541ca850d3ebf0f62",
"assets/assets/images/badges/butterfly.png": "516ff19ab5382069e9306eeae7bc87fe",
"assets/assets/images/badges/crawler.png": "9671578c12ac0afb9f936da901163d9d",
"assets/assets/images/badges/dolphin.png": "09d424926743d851d841f78f113f4e0d",
"assets/assets/images/badges/floater.png": "e54da5d89c81fa4533c113c1acdddc59",
"assets/assets/images/badges/full_swimmer.png": "6f6695e42eeddc963cbc3f6f5db78531",
"assets/assets/images/badges/kraken.png": "e4554a56bb074444c9e9bba2eeb38dbb",
"assets/assets/images/badges/leaf.png": "5d3c9e426932fbfa1c96118c75b9da7e",
"assets/assets/images/badges/mosasaurus.png": "2b334586213acc35a194cf00ab882d53",
"assets/assets/images/badges/orca.png": "40cd8036b64549f5dbdf9385f3dab562",
"assets/assets/images/badges/shark.png": "b699effe7de88ee398f972bf83834cee",
"assets/assets/images/badges/starter.png": "f3a9994f5b1e17a0f9bb701cf0c2127f",
"assets/assets/images/badges/tsunami.png": "9ba061cc3fc821b8b85a83b837bc2887",
"assets/assets/images/badges/whale.png": "52a94a44cefb1b52111fc3804e9eebac",
"assets/assets/images/Crocodile.png": "2038927b2314f2722e39bd4f77e72558",
"assets/assets/images/Dauphin.png": "d5de3e7f0842a1f905c43a5bbca47c02",
"assets/assets/images/elephant.png": "580b39f07cfbced9e5a57c67d04dc62e",
"assets/assets/images/Requin.png": "d16c91f1776bade48c16662cc663b694",
"assets/assets/logo.jpg": "cb72e9e3e77bc661eaae70a16a478113",
"assets/FontManifest.json": "299feae122df016796312ceb7839e5a2",
"assets/fonts/MaterialIcons-Regular.otf": "aaeee0ea1020b5c4e3950922847a3b13",
"assets/NOTICES": "eb1b067c4736b6da441e2bc3817498d4",
"assets/packages/cupertino_icons/assets/CupertinoIcons.ttf": "33b7d9392238c04c131b6ce224e13711",
"assets/packages/flutter_iconly/fonts/IconlyBroken.ttf": "541df649654f074a25833daa64e246f3",
"assets/packages/flutter_iconly/fonts/IconlyLight.ttf": "25d014c0a013024ffb898071af3bff6c",
"assets/packages/flutter_iconly/fonts/iconly_bold.ttf": "20ae062785ef7ebe5d2eaaf4ddbb8e3a",
"assets/packages/font_awesome_flutter/lib/fonts/fa-brands-400.ttf": "15d54d142da2f2d6f2e90ed1d55121af",
"assets/packages/font_awesome_flutter/lib/fonts/fa-regular-400.ttf": "23ea28e028bce53aded4a7915d99bfd2",
"assets/packages/font_awesome_flutter/lib/fonts/fa-solid-900.ttf": "9092bad19832a47d034149537a73be60",
"assets/shaders/ink_sparkle.frag": "ecc85a2e95f5e9f53123dcaf8cb9b6ce",
"canvaskit/canvaskit.js": "86e461cf471c1640fd2b461ece4589df",
"canvaskit/canvaskit.js.symbols": "68eb703b9a609baef8ee0e413b442f33",
"canvaskit/canvaskit.wasm": "efeeba7dcc952dae57870d4df3111fad",
"canvaskit/chromium/canvaskit.js": "34beda9f39eb7d992d46125ca868dc61",
"canvaskit/chromium/canvaskit.js.symbols": "5a23598a2a8efd18ec3b60de5d28af8f",
"canvaskit/chromium/canvaskit.wasm": "64a386c87532ae52ae041d18a32a3635",
"canvaskit/skwasm.js": "f2ad9363618c5f62e813740099a80e63",
"canvaskit/skwasm.js.symbols": "80806576fa1056b43dd6d0b445b4b6f7",
"canvaskit/skwasm.wasm": "f0dfd99007f989368db17c9abeed5a49",
"canvaskit/skwasm_st.js": "d1326ceef381ad382ab492ba5d96f04d",
"canvaskit/skwasm_st.js.symbols": "c7e7aac7cd8b612defd62b43e3050bdd",
"canvaskit/skwasm_st.wasm": "56c3973560dfcbf28ce47cebe40f3206",
"favicon.png": "5dcef449791fa27946b3d35ad8803796",
"flutter.js": "76f08d47ff9f5715220992f993002504",
"flutter_bootstrap.js": "acb7d99210a31789050d99150e05cf51",
"icons/Icon-192.png": "ac9a721a12bbc803b44f645561ecb1e1",
"icons/Icon-512.png": "96e752610906ba2a93c65f8abe1645f1",
"icons/Icon-maskable-192.png": "c457ef57daa1d16f64b27b786ec2ea3c",
"icons/Icon-maskable-512.png": "301a7604d45b3e739efc881eb04896ea",
"index.html": "ddaea6c439d92943e6e13b53c04cd008",
"/": "ddaea6c439d92943e6e13b53c04cd008",
"main.dart.js": "d003494e268062ef834c63b993deae83",
"manifest.json": "79ca5cf45d6d0072f7660aaf50c5066b",
"version.json": "c967816ea638bcd4ae5874ede693aa47"};
// The application shell files that are downloaded before a service worker can
// start.
const CORE = ["main.dart.js",
"index.html",
"flutter_bootstrap.js",
"assets/AssetManifest.bin.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(
        CORE.map((value) => new Request(value, {'cache': 'reload'})));
    })
  );
});
// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');
      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        // Claim client to enable caching on first launch
        self.clients.claim();
        return;
      }
      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      // Claim client to enable caching on first launch
      self.clients.claim();
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});
// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // Redirect URLs to the index.html
  if (key.indexOf('?v=') != -1) {
    key = key.split('?v=')[0];
  }
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#') || key == '') {
    key = '/';
  }
  // If the URL is not the RESOURCE list then return to signal that the
  // browser should take over.
  if (!RESOURCES[key]) {
    return;
  }
  // If the URL is the index.html, perform an online-first request.
  if (key == '/') {
    return onlineFirst(event);
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache only if the resource was successfully fetched.
        return response || fetch(event.request).then((response) => {
          if (response && Boolean(response.ok)) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      })
    })
  );
});
self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'downloadOffline') {
    downloadOffline();
    return;
  }
});
// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey of Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return contentCache.addAll(resources);
}
// Attempt to download the resource online before falling back to
// the offline cache.
function onlineFirst(event) {
  return event.respondWith(
    fetch(event.request).then((response) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch((error) => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response != null) {
            return response;
          }
          throw error;
        });
      });
    })
  );
}
