class Monster < ApplicationRecord
  # Associations
  belongs_to :vice

  # Validations
  validates :name, presence: true, uniqueness: true
  validates :mesh_name, presence: true

  # Scopes
  scope :by_name, -> { order(:name) }
  scope :by_vice, ->(vice_id) { where(vice_id: vice_id) }

  # Instance methods
  def mesh_path
    "/meshes/#{mesh_name}"
  end
end

