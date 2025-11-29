class CreateVices < ActiveRecord::Migration[7.1]
  def change
    create_table :vices do |t|
      t.string :name, null: false
      t.text :description

      t.timestamps
    end

    add_index :vices, :name, unique: true
  end
end

