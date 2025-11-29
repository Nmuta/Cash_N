Rails.application.routes.draw do
  # Devise routes for user authentication
  devise_for :users, controllers: {
    sessions: 'users/sessions',
    registrations: 'users/registrations'
  }

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  root "pages#index"
  get "game" => "pages#rpg", as: :game
  get "wizard" => "pages#wizard", as: :wizard
  post "wizard/submit" => "pages#wizard_submit", as: :wizard_submit
  get "juego" => "pages#juego", as: :juego
  get "world" => "pages#world", as: :world
  get "roota" => "pages#game", as: :roota
  get "friends" => "pages#friends", as: :friends
  get "rpg" => "pages#rpg", as: :rpg
  
  # API endpoints for RPG game integration
  namespace :api do
    get "player_data" => "rpg#player_data", as: :player_data
  end
  
  # Serve modified RPG game index.html with integration
  get "rpg/cash/Ca$h_N/index.html" => "pages#rpg_game_index", as: :rpg_game_index
end