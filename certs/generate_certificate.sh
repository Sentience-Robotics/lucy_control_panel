openssl genrsa -out key.pem 2048
openssl req -new -x509 -key key.pem -out cert.pem -days 365 -subj "/CN=localhost"
mkdir -p /home/dev/certs
cp cert.pem /home/dev/certs/cert.pem
cp key.pem /home/dev/certs/key.pem
