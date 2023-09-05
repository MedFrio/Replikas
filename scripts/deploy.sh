#!/bin/bash
source "./scripts/load-dotenv.sh"
source "./scripts/colors.sh"

echo -e "${CYAN}Uploading source to server...${NC}"
# Check if rsync is installed
if ! command -v rsync &> /dev/null
then
    echo -e "${RED}rsync could not be found. Please install rsync and try again.${NC}"
    exit 1
fi
rsync -avz --exclude-from '.gitignore' . $SERVER_USER@$SERVER_IP:$DEPLOY_PATH &> /dev/null
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to upload source to server.${NC}"
    exit 1
fi

echo -e "${CYAN}Installing dependencies on server...${NC}"
sshpass ssh $SERVER_USER@$SERVER_IP "cd $DEPLOY_PATH && npm install" &> /dev/null

echo -e "${CYAN}Building project on server...${NC}"
sshpass ssh $SERVER_USER@$SERVER_IP "cd $DEPLOY_PATH && npx astro build" &> /dev/null

start_server() {
    
    sleep 5 && xdg-open https://$SERVER_HOSTNAME &> /dev/null &
    bopen_pid=$!
    
    echo -e "${CYAN}Starting server...${NC}"
    sshpass ssh $SERVER_USER@$SERVER_IP "cd $DEPLOY_PATH && SERVER_KEY_PATH=$SERVER_SSL_KEYS_PATH/privkey.pem SERVER_CERT_PATH=$SERVER_SSL_KEYS_PATH/fullchain.pem npx astro preview --host 0.0.0.0 --port 8080 2>&1 | tee logs/latest.log"
    out=$?

    if [ $out -ne 0 ] && [ $out -ne 255 ]; then
        kill $bopen_pid &> /dev/null
        echo -e "${RED}Failed to start server.${NC}"
        sleep 1
        echo -e "${RED}Trying to stop already running server...${NC}"
        sshpass ssh $SERVER_USER@$SERVER_IP "netstat -tulpn | grep :8080 | awk '{print \$7}' | cut -d/ -f1 | xargs kill" &> /dev/null
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to stop server.${NC}"
            exit 1
        else
            echo -e "${GREEN}Killed previous server${NC}"
            echo -e "${BOLD}${CYAN}Try to start server again ? (Y/n)${NC}${NORMAL}"
            read -r answer
            if [ "$answer" != "${answer#[Yy]}" ] || [ -z "$answer" ]; then
                start_server
            else
                exit 1
            fi
        fi
        exit 1
    fi
    echo -en "\r${CYAN}Stopping server...${NC}\n"
    sshpass ssh $SERVER_USER@$SERVER_IP "netstat -tulpn | grep :8080 | awk '{print \$7}' | cut -d/ -f1 | xargs kill" &> /dev/null
    echo -e "${BOLD}${GREEN}Done!${NC}${NORMAL}"
}
start_server
unset -f start_server
