class CreatePlaceTypes < ActiveRecord::Migration[7.1]
  def change
    create_table :place_types do |t|
      t.string :name, null: false
      t.string :image_url

      t.timestamps
    end

    add_index :place_types, :name, unique: true
  end
end

