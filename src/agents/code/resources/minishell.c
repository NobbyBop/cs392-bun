//Nicholas Mirigliani
//I pledge my honor that I have abided by the Stevens Honor System.

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <signal.h>
#include <sys/wait.h>
#include <pwd.h>
#include <errno.h>
#include <dirent.h>
#include <unistd.h>

#define BLUE "\x1b[34;1m"
#define DEFAULT "\x1b[0m"

volatile sig_atomic_t interrupted = 0;


// #define DEBUG_PARSE
// #define DEBUG_CMD

void freeArgs(char*** args, int len){
    for(int i = 0; i < len; i++){
        #ifdef DEBUG_PARSE
            printf("About to free: %s\n", (*args)[i]);
        #endif
        free((*args)[i]);
    }
    free(*args);
    // (*args) = NULL;
}

void scanArgs(char* cmd, char*** buf, int* numArgs){
    //Takes a string a modifies buf to be an array of all the individual terms,
    //and modifies numArgs to be the length of buf.
    char* delim = " \n";
    *numArgs = 0;
    char* next = strtok(cmd, delim);
    while (next != NULL) {
        #ifdef DEBUG_PARSE
            printf("Argument #%d read: %s\n", *numArgs, next);
        #endif

        (*buf) = realloc((*buf), (*numArgs+1)*sizeof(char*));
        if(*buf == NULL){
            fprintf(stderr, "Error: realloc() failed. %s\n", strerror(errno));
            break;
        }
        (*buf)[*numArgs] = malloc(strlen(next)+1);
        if((*buf)[*numArgs] == NULL){
            fprintf(stderr, "Error: malloc() failed. %s\n", strerror(errno));
            break;
        }
        strcpy((*buf)[*numArgs], next);
        *numArgs = *numArgs + 1;
        next = strtok(NULL, delim); 
    }
}

int cmp_pid(const void *a, const void *b) {
    return (atoi((char*)a) - atoi((char*)b));
}

void interupt(int signum){
    printf("\n");
    //make sure to kill the child if it exists (fixed messing up printing order).
    wait(NULL);
    interrupted = 1;
}

int main(){

    //Setting up the SIGINT behavior.
    struct sigaction setup_action = {0};
    setup_action.sa_handler = interupt;
    if(sigaction(SIGINT, &setup_action, NULL) == -1){
        fprintf(stderr, "Error: Cannot register signal handler. %s", strerror(errno));
        exit(EXIT_FAILURE);
    }

    //bool - if set to 1 the main loop terminates.
    int willExit = 0;
    //Stores the input string from the prompt.
    char input[4096];
    //Counts the number of terms passed contained in input.
    int numArgs = 0;
    //String array that stores each term of the input individually.
    char** args = NULL;
    //String to store current working directory.
    char* cwd;

    //Get the current user's username and home directory.
    uid_t user_id = getuid();
    struct passwd *pwd_entry = getpwuid(user_id);
    char* user = pwd_entry->pw_name;
    char* homedir = pwd_entry->pw_dir;
    
    size_t buffer = 0;
    while(willExit == 0){
        //get CWD and print prompt.
        cwd = getcwd(NULL, 0);
        if(cwd == NULL){
            fprintf(stderr, "Error: Cannot get current working directory. %s", strerror(errno));
            exit(EXIT_FAILURE);
        }
        printf("%s[%s]> %s", BLUE, cwd, DEFAULT);
        //get the user input and parse.
        // int read = getline(&input, &buffer, stdin);
        if (fgets(input, 4096, stdin) != NULL) {
             scanArgs(input, &args, &numArgs);
        } else {
            if(interrupted){
                interrupted = 0;
                memset(input, 0, sizeof(input));
                continue;
            }
            fprintf(stderr, "Error: Failed to read from stdin. %s", strerror(errno));
            exit(EXIT_FAILURE);
        }
        //if no args, just give another prompt.
        if(!interrupted){
            if(numArgs > 0){
                #ifdef DEBUG_CMD
                    printf("Command: [%s]\n", args[0]);
                #endif

                //CD
                if(strcmp("cd", args[0])==0){
                    if(numArgs == 1){
                        chdir(homedir);
                    } else if(numArgs == 2){
                        if(strcmp("~", args[1])==0){
                            chdir(homedir);
                        } else {
                            if (chdir(args[1]) == -1){
                                fprintf(stderr, "Error: Cannot change directory to %s. %s\n", args[1], strerror(errno));
                            }
                        }
                    } else {
                        fprintf(stderr, "Error: Too many arguments to cd.\n");
                    }
                    
                }
                //EXIT
                else if(strcmp("exit", args[0])==0){
                    if(numArgs != 1){
                        fprintf(stderr, "Error: exit does not take any arguments.\n");
                    } else
                        willExit = 1;
                }
                //PWD
                else if(strcmp("pwd", args[0])==0){
                    if(numArgs != 1){
                        fprintf(stderr, "Error: pwd does not take any arguments.\n");
                    } else
                        printf("%s\n", cwd);
                }
                //LF
                else if(strcmp("lf", args[0])==0){
                    if(numArgs != 1){
                        fprintf(stderr, "Error: lf does not take any arguments.\n");
                    } else {
                        DIR* dir = opendir(cwd);
                        struct dirent *cur_file = readdir(dir);
                        char* filename;
                        //Loop through all files in directory and print them.
                        while(cur_file != NULL){
                            filename = cur_file->d_name;
                            if(strcmp(filename,".") != 0 && strcmp(filename,"..") != 0){
                                printf("%s\n", filename);
                            }
                            cur_file = readdir(dir);
                        }
                        closedir(dir);
                    }
                }
                //LP
                else if(strcmp("lp", args[0])==0){
                    if(numArgs != 1){
                        fprintf(stderr, "Error: lp does not take any arguments.\n");
                    } else {
                        //counts the number of processes found in proc.
                        int numProcesses = 0;
                        char** arr = NULL;
                        DIR* dir = opendir("/proc");
                        if(dir == NULL){
                            fprintf(stderr, "Error: opendir() failed. %s\n", strerror(errno));
                            break;
                        }
                        struct dirent *cur_file = readdir(dir);
                        char* filename;
                        while(cur_file != NULL){
                            filename = cur_file->d_name;
                            if(atoi(filename) != 0){
                                arr = realloc(arr, (numProcesses+1)*sizeof(char*));
                                if(arr == NULL){
                                    fprintf(stderr, "Error: realloc() failed. %s\n", strerror(errno));
                                    closedir(dir);
                                    break;
                                }
                                arr[numProcesses] = malloc(strlen(filename)+1);
                                if(arr[numProcesses] == NULL){
                                    fprintf(stderr, "Error: malloc() failed. %s\n", strerror(errno));
                                    closedir(dir);
                                    break;
                                }
                                strcpy(arr[numProcesses], filename);
                                numProcesses++;
                            }
                            cur_file = readdir(dir);
                        }
                        closedir(dir);
                        qsort(arr, numProcesses, sizeof(int), cmp_pid);

                        /*Each iteration: 
                        change to /proc/<PID>/, get the owner with st.st_uid,
                        get the command from cmdline, display. */
                        for(int i = 0; i < numProcesses; i++){
                            chdir("/proc");
                            chdir(arr[i]);
                            struct stat st;
                            stat(".", &st);
                            struct passwd *pw_entry = getpwuid(st.st_uid);
                            FILE* fp = fopen("cmdline", "r");
                            if(fp == NULL){
                                fprintf(stderr, "Error: fopen() failed. %s\n", strerror(errno));
                            } else {
                                char cmdstr[4096]; //This is the max length of a Linux command.
                                int len = fread(cmdstr, 1, sizeof(cmdstr), fp);
                                printf("%5s %s %s\n", arr[i], pw_entry->pw_name, cmdstr);
                            }
                        }
                        freeArgs(&arr, numProcesses);
                        arr = NULL;
                        chdir(cwd);
                    }
                } else {
                    args = realloc(args, (numArgs+1)*sizeof(char*));
                    if(args == NULL){
                        fprintf(stderr, "Error: realloc() failed. %s\n", strerror(errno));
                    } else {
                        args[numArgs] = NULL;
                        pid_t pid = fork();
                        if(pid == -1){
                            fprintf(stderr, "Error: fork() failed. %s\n", strerror(errno));
                        }else if(pid == 0){
                            execvp(args[0], args);
                            fprintf(stderr, "Error: exec() failed. %s\n", strerror(errno));
                            exit(-1);
                        } else {
                            int stat;
                            wait(&stat);
                        }
                    }
                }
            }
            freeArgs(&args, numArgs);
            memset(input, 0, sizeof(input));
            args = NULL;
            free(cwd);
            cwd = NULL;
        }
        interrupted = 0;
    }
    
}