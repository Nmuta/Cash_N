class Vice < ApplicationRecord
  # Associations
  has_many :monsters, dependent: :destroy
  has_many :users_vices, dependent: :destroy
  has_many :users, through: :users_vices

  # Validations
  validates :name, presence: true, uniqueness: true

  # Scopes
  scope :alphabetical, -> { order(:name) }
  scope :with_monsters, -> { joins(:monsters).distinct }

  # Instance methods
  def monsters_count
    monsters.count
  end
end

