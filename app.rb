
require 'sinatra'
#require "sinatra/content_for"
require "sinatra/reloader" if development?
require 'json'
require 'yaml'
require 'erubis'

require 'securerandom'


get '/' do
	key = SecureRandom.hex(4)
	redirect to("/t/#{key}")
end

get '/t/:key' do |key|
	erb :index
end

