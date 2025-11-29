# Be sure to restart your server when you modify this file.

# Version of your assets, change this if you want to expire all your assets.
Rails.application.config.assets.version = "1.0"

# Add additional assets to the asset load path.
# Rails.application.config.assets.paths << Emoji.images_path

# Precompile additional assets.
# application.js, application.css, and all non-JS/CSS in the app/assets
# folder are already added.
# Rails.application.config.assets.precompile += %w( admin.js admin.css )

# Serve PlayCanvas module scripts as static files
# Add the play-canvas-scripts folder to the asset load path
Rails.application.config.assets.paths << Rails.root.join('app', 'assets', 'javascripts', 'play-canvas-scripts')

# Precompile .mjs files so they can be served
Rails.application.config.assets.precompile += %w[play-canvas-scripts/rotate.mjs]
Rails.application.config.assets.precompile += %w[play-canvas-scripts/movement.mjs]
Rails.application.config.assets.precompile += %w[play-canvas-scripts/material.mjs]
Rails.application.config.assets.precompile += %w[play-canvas-scripts/vice-spawner.mjs]
Rails.application.config.assets.precompile += %w[sky-gradient.mjs]
Rails.application.config.assets.precompile += %w[play-canvas-scripts/player-controller.mjs]
Rails.application.config.assets.precompile += %w[play-canvas-scripts/create-box.mjs]
Rails.application.config.assets.precompile += %w[play-canvas-scripts/create-house.mjs]
Rails.application.config.assets.precompile += %w[play-canvas-scripts/player-physics.mjs]
Rails.application.config.assets.precompile += %w[play-canvas-scripts/player-geolocation.mjs]
Rails.application.config.assets.precompile += %w[play-canvas-scripts/player-device-orientation.mjs]
Rails.application.config.assets.precompile += %w[play-canvas-scripts/coordinate-grid-markers.mjs]
Rails.application.config.assets.precompile += %w[play-canvas-scripts/ball-spawn.mjs]
Rails.application.config.assets.precompile += %w[play-canvas-scripts/juego.mjs]

# Note: Binary files like .glb models should go in public/ folder, not asset pipeline
