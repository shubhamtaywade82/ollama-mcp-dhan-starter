#!/usr/bin/env ruby
require 'sinatra'
require 'json'
require 'webrick'

# Simple Sinatra stub server for MCP tools
set :port, 3000
set :bind, '0.0.0.0'
set :server, :webrick

# Add CORS headers
before do
  headers 'Access-Control-Allow-Origin' => '*'
  headers 'Access-Control-Allow-Methods' => 'GET, POST, OPTIONS'
  headers 'Access-Control-Allow-Headers' => 'Content-Type'
end

# Handle preflight requests
options '*' do
  200
end

# GET /llm/funds - Return available funds
get '/llm/funds' do
  content_type :json
  { "available" => 999999 }.to_json
end

# GET /llm/spot - Return spot price for underlying
get '/llm/spot' do
  content_type :json
  underlying = params[:underlying] || 'NIFTY'

  # Mock spot prices for different underlyings
  spot_prices = {
    'NIFTY' => 22490,
    'BANKNIFTY' => 47250,
    'FINNIFTY' => 21200
  }

  {
    "symbol" => underlying,
    "spot" => spot_prices[underlying] || 22000
  }.to_json
end

# GET /llm/quote - Return LTP for security
get '/llm/quote' do
  content_type :json
  security_id = params[:securityId] || '123456'

  # Mock LTP based on security ID
  ltp = case security_id.to_i
  when 123456 then 102.5
  when 789012 then 45.75
  when 345678 then 78.25
  else 50.0
  end

  {
    "securityId" => security_id.to_i,
    "ltp" => ltp
  }.to_json
end

# GET /llm/option_chain - Return option chain data
get '/llm/option_chain' do
  content_type :json
  underlying = params[:underlying] || 'NIFTY'
  expiry = params[:expiry] || 'next_week'

  # Mock option chain data
  {
    "underlying" => underlying,
    "expiry" => expiry,
    "spot" => 22490,
    "calls" => [
      { "strike" => 22400, "ltp" => 120.5, "oi" => 250000 },
      { "strike" => 22500, "ltp" => 85.25, "oi" => 300000 },
      { "strike" => 22600, "ltp" => 55.75, "oi" => 275000 }
    ],
    "puts" => [
      { "strike" => 22400, "ltp" => 75.25, "oi" => 200000 },
      { "strike" => 22500, "ltp" => 95.50, "oi" => 280000 },
      { "strike" => 22600, "ltp" => 125.75, "oi" => 320000 }
    ]
  }.to_json
end

# POST /llm/place_bracket_order - Place a bracket order
post '/llm/place_bracket_order' do
  content_type :json

  # Parse request body
  request.body.rewind
  order_data = JSON.parse(request.body.read)

  # Generate a mock order ID
  order_id = "TEST#{rand(100000..999999)}"

  # Echo back the order data with order ID
  {
    "orderId" => order_id,
    "status" => "placed",
    "message" => "Order placed successfully",
    "originalData" => order_data
  }.to_json
end

# Health check endpoint
get '/health' do
  content_type :json
  { "status" => "ok", "message" => "Stub server running" }.to_json
end

# Root endpoint
get '/' do
  content_type :json
  {
    "message" => "MCP Stub Server",
    "endpoints" => [
      "GET /llm/funds",
      "GET /llm/spot?underlying=NIFTY",
      "GET /llm/quote?securityId=123456",
      "GET /llm/option_chain?underlying=NIFTY&expiry=next_week",
      "POST /llm/place_bracket_order"
    ]
  }.to_json
end

puts "Starting MCP Stub Server on http://localhost:3000"
puts "Available endpoints:"
puts "  GET  /llm/funds"
puts "  GET  /llm/spot?underlying=NIFTY"
puts "  GET  /llm/quote?securityId=123456"
puts "  GET  /llm/option_chain?underlying=NIFTY&expiry=next_week"
puts "  POST /llm/place_bracket_order"
puts "  GET  /health"
puts ""
puts "API Key: changeme"
puts "Use header: X-API-Key: changeme"
