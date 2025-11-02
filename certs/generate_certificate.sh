openssl genrsa -out key.pem 2048

openssl req -x509 -new -nodes \
  -key key.pem \
  -sha256 -days 365 \
  -out cert.pem \
  -config cert.conf

mkdir -p /home/dev/certs
cp cert.pem /home/dev/certs/cert.pem
cp key.pem /home/dev/certs/key.pem
