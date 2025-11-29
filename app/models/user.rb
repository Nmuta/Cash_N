class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  # Associations
  has_many :users_vices, dependent: :destroy
  has_many :vices, through: :users_vices
  has_many :places, dependent: :destroy

  # Instance methods
  def wizard_finished?
    wizard_finished == true
  end
end
