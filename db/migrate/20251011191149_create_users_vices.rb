class CreateUsersVices < ActiveRecord::Migration[7.1]
  def change
    create_table :users_vices do |t|
      t.references :user, null: false, foreign_key: true
      t.references :vice, null: false, foreign_key: true

      t.timestamps
    end

    # Add composite index to ensure a user can't have the same vice twice
    add_index :users_vices, [:user_id, :vice_id], unique: true
  end
end

