class PagesController < ApplicationController
  before_action :authenticate_user!, only: [:wizard]

  def index
  end

    def game
      if !current_user.wizard_finished?
        redirect_to wizard_path, notice: "Choose your adversaries"
        return
      end
      
      @vices = current_user.vices || []
    end

  def juego
    @vices = current_user.vices || []
  end

  def wizard
    @vices = Vice.alphabetical
    @user_vice_ids = current_user.vice_ids
 
  end

  def wizard_submit
    vice_ids = params[:vice_ids] || []
    
    # Clear existing vices and add new ones
    current_user.vice_ids = vice_ids
    
    # Mark wizard as finished
    current_user.update(wizard_finished: true)
    
    redirect_to game_path, notice: "Your adversaries have been set! Time to battle."
  end

  def world
  end

  def friends
  end

  def rpg
    @vices = current_user.vices || []
  end

  def rpg_game_index
    # Serve a modified version of the RPG game's index.html
    # that includes our custom integration script
    render file: Rails.root.join('app', 'views', 'pages', 'rpg_game_index.html.erb'), layout: false
  end

end