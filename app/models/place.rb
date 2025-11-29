class Place < ApplicationRecord
  belongs_to :place_type
  belongs_to :user

  validates :name, presence: true
  validates :latitude, presence: true
  validates :longitude, presence: true
end

