class AddImageToVice < ActiveRecord::Migration[7.1]
  def change
    add_column :vices, :image, :string
  end
end
