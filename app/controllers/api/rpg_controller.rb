class Api::RpgController < ApplicationController
  # Skip CSRF token for API endpoint (you may want to add API authentication later)
  skip_before_action :verify_authenticity_token, if: :json_request?
  before_action :authenticate_user!, only: [:player_data]

  def player_data
    # Return player data in a format the RPG game can use
    render json: {
      user_id: current_user.id,
      email: current_user.email,
      vices: current_user.vices.map do |vice|
        {
          id: vice.id,
          name: vice.name,
          image_url: vice.image_url,
          monsters: vice.monsters.map do |monster|
            {
              id: monster.id,
              name: monster.name
            }
          end
        }
      end,
      # Add other player data as needed:
      # points: current_user.points || 0,
      # money: current_user.money || 0,
      # level: current_user.level || 1,
      timestamp: Time.current.to_i
    }
  end

  private

  def json_request?
    request.format.json?
  end
end

