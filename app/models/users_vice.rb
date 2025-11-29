class UsersVice < ApplicationRecord
  belongs_to :user
  belongs_to :vice

  # Validations
  validates :user_id, uniqueness: { scope: :vice_id, message: "already has this vice" }
end

