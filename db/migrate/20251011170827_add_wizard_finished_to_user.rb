class AddWizardFinishedToUser < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :wizard_finished, :boolean, default: false
  end
end
