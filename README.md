# README

 
where stuff is:
all meshes are served from the public folder 
public/meshes

however, the Blender file with the avatar mesh for character is located
in public/blender 

idle and swim in same file : 
https://chatgpt.com/c/68e824df-cfb0-8323-8bf5-f28418abcd7
(eff)

BLENDER files animated with full textures are in the Blender folder



converting FBX to GLB online: 
https://products.groupdocs.app/conversion/fbx-to-gltf





remember to add new scripts to assets.rb



https://cash-in-896caf3cc8ab.herokuapp.com/ 



const geo = document.querySelector("pc-app").app.root.findByName('player').script?.playerGeolocation;



geo?.debugTeleportMeters(0, -1);  // move 1 meter north

Array.from({ length: 100 }).forEach((_, i) => {
  setTimeout(() => geo?.debugTeleportMeters(0, -0.1), i * 100);
});